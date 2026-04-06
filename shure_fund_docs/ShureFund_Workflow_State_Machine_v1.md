# Workflow State Machine

## Stage States

-   blocked
-   ready
-   approved
-   released

## Transitions

blocked -\> ready (conditions met) ready -\> approved (approvals
complete) approved -\> released (payment executed)

## Exceptions

-   override can bypass states
-   disputes pause progression
