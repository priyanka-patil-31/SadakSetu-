# SadakSetu Complaint Management

Complaint APIs are available under `/api/v1/complaints`.

- Citizens create complaints with validated latitude/longitude and can view only their own complaints.
- Administrators can view all complaints, update controlled statuses, add administrative notes, and delete only submitted/rejected invalid reports.
- Every creation and status change records a `complaint_updates` timeline entry.
- Status transitions are explicitly controlled; terminal `RESOLVED` and `REJECTED` complaints cannot be moved arbitrarily.
- Complaint listing supports pagination, status, severity, area, and title/number search filters.
