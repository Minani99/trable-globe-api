package com.travelglobe.trableglobeapi.global.exception;

import com.travelglobe.trableglobeapi.global.response.ApiError;
import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import com.travelglobe.trableglobeapi.global.response.FieldErrorDetail;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Translates exceptions into the shared {@link ApiResponse} envelope.
 *
 * <p>Stack traces are logged, never serialised: unexpected failures return a fixed
 * message so internal details cannot leak through the API.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private static final String UNEXPECTED_ERROR_MESSAGE =
            "요청을 처리하는 중 오류가 발생했습니다.";

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.failure(ex.getMessage(),
                        ApiError.of(ErrorCode.RESOURCE_NOT_FOUND.name())));
    }

    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidRequest(InvalidRequestException ex) {
        return ResponseEntity.badRequest()
                .body(ApiResponse.failure(ex.getMessage(),
                        ApiError.of(ErrorCode.INVALID_REQUEST.name())));
    }

    @ExceptionHandler(AuthenticationFailedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationFailed(AuthenticationFailedException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.failure(ex.getMessage(),
                        ApiError.of(ErrorCode.AUTHENTICATION_FAILED.name())));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.failure(ex.getMessage(), ApiError.of(ErrorCode.ACCESS_DENIED.name())));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiResponse<Void>> handleConflict(ConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.failure(ex.getMessage(), ApiError.of(ErrorCode.CONFLICT.name())));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataConflict(DataIntegrityViolationException ex) {
        log.info("Rejected conflicting write: {}", ex.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.failure("이미 사용 중인 정보가 있습니다.",
                        ApiError.of(ErrorCode.CONFLICT.name())));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        List<FieldErrorDetail> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(GlobalExceptionHandler::toFieldErrorDetail)
                .toList();

        return ResponseEntity.badRequest()
                .body(ApiResponse.failure("입력값이 올바르지 않습니다.",
                        ApiError.of(ErrorCode.VALIDATION_FAILED.name(), fieldErrors)));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest()
                .body(ApiResponse.failure("요청 형식을 확인해 주세요.",
                        ApiError.of(ErrorCode.VALIDATION_FAILED.name())));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String field = ex.getName();
        return ResponseEntity.badRequest()
                .body(ApiResponse.failure("입력값이 올바르지 않습니다.",
                        ApiError.of(ErrorCode.VALIDATION_FAILED.name(),
                                List.of(new FieldErrorDetail(field, "형식이 올바르지 않습니다.")))));
    }

    /**
     * An unmapped path is a 404, not a server error.
     *
     * <p>Without this the catch-all below turned every request for a path this API does
     * not serve - the service root, {@code /favicon.ico}, anything a crawler tries - into
     * a 500 with a full stack trace in the logs. Logged at debug because it says nothing
     * about the health of the application.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResource(NoResourceFoundException ex) {
        log.debug("No handler for {}", ex.getResourcePath());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.failure("존재하지 않는 경로입니다.",
                        ApiError.of(ErrorCode.RESOURCE_NOT_FOUND.name())));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex) {
        log.error("Unhandled exception while serving request", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.failure(UNEXPECTED_ERROR_MESSAGE,
                        ApiError.of(ErrorCode.INTERNAL_ERROR.name())));
    }

    private static FieldErrorDetail toFieldErrorDetail(FieldError fieldError) {
        String message = fieldError.getDefaultMessage() == null
                ? "올바르지 않은 값입니다."
                : fieldError.getDefaultMessage();
        return new FieldErrorDetail(fieldError.getField(), message);
    }
}
