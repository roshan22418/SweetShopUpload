package com.sweetshop.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import tools.jackson.databind.DatabindException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Every error the API returns has one shape — {"status": 400, "message": "...", "errors"?: {...}} — so the
 * frontend can always show {@code message}. Extending ResponseEntityExceptionHandler routes Spring MVC's own
 * errors (bad JSON, wrong method, unknown route, ...) through the same writer; anything unexpected becomes a
 * generic 500 whose details only go to the log.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    static Map<String, Object> errorBody(int status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status);
        body.put("message", message);
        return body;
    }

    private static ResponseEntity<Object> error(HttpStatusCode status, String message) {
        return ResponseEntity.status(status).body(errorBody(status.value(), message));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Object> handleResponseStatusException(ResponseStatusException ex) {
        return error(ex.getStatusCode(), ex.getReason() != null ? ex.getReason() : "Request failed");
    }

    // Fallback for any write blocked by a database constraint that isn't already given a more specific,
    // actionable message at the call site (e.g. ProductService/CategoryService deletes).
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Object> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("Constraint violation: {}", ex.getMostSpecificCause().getMessage());
        return error(HttpStatus.CONFLICT, "This conflicts with existing data — for example, other records still depend on it.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleUnexpected(Exception ex) {
        log.error("Unhandled error", ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong on our side. Please try again.");
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
        }
        Map<String, Object> body = errorBody(HttpStatus.BAD_REQUEST.value(), "Validation failed");
        body.put("errors", fieldErrors);
        return ResponseEntity.badRequest().body(body);
    }

    @Override
    protected ResponseEntity<Object> handleMaxUploadSizeExceededException(
            MaxUploadSizeExceededException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return error(HttpStatus.PAYLOAD_TOO_LARGE, "File too large (max 5MB)");
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return error(HttpStatus.BAD_REQUEST, describeUnreadableBody(ex));
    }

    @Override
    protected ResponseEntity<Object> handleTypeMismatch(
            TypeMismatchException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        String name = ex.getPropertyName() != null ? ex.getPropertyName() : "parameter";
        String value = String.valueOf(ex.getValue());
        if (value.length() > 40) value = value.substring(0, 40) + "…";
        return error(HttpStatus.BAD_REQUEST, "Invalid value '" + value + "' for " + name);
    }

    @Override
    protected ResponseEntity<Object> handleMissingServletRequestPart(
            MissingServletRequestPartException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return error(HttpStatus.BAD_REQUEST, "Missing '" + ex.getRequestPartName() + "' in the upload");
    }

    @Override
    protected ResponseEntity<Object> handleMissingServletRequestParameter(
            MissingServletRequestParameterException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return error(HttpStatus.BAD_REQUEST, "Missing required parameter '" + ex.getParameterName() + "'");
    }

    @Override
    protected ResponseEntity<Object> handleHttpRequestMethodNotSupported(
            HttpRequestMethodNotSupportedException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return error(HttpStatus.METHOD_NOT_ALLOWED, ex.getMethod() + " is not supported for this URL");
    }

    @Override
    protected ResponseEntity<Object> handleNoResourceFoundException(
            NoResourceFoundException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return error(HttpStatus.NOT_FOUND, "Not found");
    }

    /** Everything else Spring MVC raises itself: keep its status, use our body. */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, Object body, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        HttpStatus resolved = HttpStatus.resolve(status.value());
        return ResponseEntity.status(status).headers(headers)
                .body(errorBody(status.value(), resolved != null ? resolved.getReasonPhrase() : "Request failed"));
    }

    /** Names the offending field for a wrong value ("Invalid value for 'fulfillmentType'"), never internals. */
    private static String describeUnreadableBody(HttpMessageNotReadableException ex) {
        for (Throwable cause = ex.getCause(); cause != null; cause = cause.getCause()) {
            if (cause instanceof DatabindException databind && !databind.getPath().isEmpty()) {
                String field = databind.getPath().stream()
                        .map(ref -> ref.getPropertyName() != null ? ref.getPropertyName() : "[" + ref.getIndex() + "]")
                        .collect(Collectors.joining("."));
                return "Invalid value for '" + field + "'";
            }
        }
        return "Request body is not valid JSON";
    }
}
