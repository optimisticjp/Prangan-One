-- Cover onboarding request foreign keys used by approval history and owner review.
create index if not exists business_onboarding_business_idx
  on business_onboarding_requests (business_id)
  where business_id is not null;

create index if not exists business_onboarding_decided_by_idx
  on business_onboarding_requests (decided_by)
  where decided_by is not null;
