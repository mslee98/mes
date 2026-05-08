-- detector_series / detectors 마이그레이션 보강
-- 목적: detectors.partner_id(nullable FK) 추가
-- 정책: 거래처 삭제 시 검출기 레코드는 유지하고 partner_id만 NULL 처리

-- 신규 구축(테이블 생성 시) 예시:
-- partner_id CHAR(36) NULL,
-- KEY idx_detectors_partner_id (partner_id),
-- CONSTRAINT fk_detectors_partner_id
--   FOREIGN KEY (partner_id) REFERENCES partners(id)
--   ON DELETE SET NULL
--   ON UPDATE CASCADE

-- 기존 DB ALTER TABLE 가이드
ALTER TABLE detectors
  ADD COLUMN partner_id CHAR(36) NULL AFTER detector_series_id;

ALTER TABLE detectors
  ADD INDEX idx_detectors_partner_id (partner_id);

ALTER TABLE detectors
  ADD CONSTRAINT fk_detectors_partner_id
    FOREIGN KEY (partner_id) REFERENCES partners(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

