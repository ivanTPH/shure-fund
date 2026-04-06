# Data Model v2

## Entities

### Project

-   id
-   name
-   status

### Stage

-   id
-   projectId
-   name
-   status
-   requiredAmount
-   releasedAmount

### Evidence

-   id
-   stageId
-   type (file/form)
-   status

### Approval

-   id
-   stageId
-   role
-   status

### LedgerAccount

-   id
-   name
-   balance

### LedgerEntry

-   id
-   accountId
-   amount
-   type
-   reference
-   timestamp

### AuditLog

-   id
-   entity
-   entityId
-   action
-   before
-   after
-   user
-   timestamp
