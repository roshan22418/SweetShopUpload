package com.sweetshop.backend.payment;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RazorpayPaymentRepository extends JpaRepository<RazorpayPayment, Long> {

    // Row lock: two checkouts racing with the same payment are serialized, so only one can claim it.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM RazorpayPayment p WHERE p.razorpayOrderId = :razorpayOrderId")
    Optional<RazorpayPayment> findByRazorpayOrderIdForUpdate(@Param("razorpayOrderId") String razorpayOrderId);
}
