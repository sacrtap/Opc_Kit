# Mermaid Flowchart Common Snippet Library

## Snippet 1: API Call + Judgment Branch

```mermaid
flowchart TD
    A[User initiates request] --> B((Call External API))
    B --> C{Response Result}
    C -->|Success| D[Process returned data]
    C -->|Failure| E{Retry count < 3?}
    E -->|Yes| B
    E -->|No| F[Show friendly error message<br/>with retry button]
    C -->|Timeout| G[Show timeout prompt<br/>guide to check network]
```

## Snippet 2: Parallel Processing + Merge

```mermaid
flowchart TD
    A[User submits form] --> B[Validate input]
    B --> C{Validation passed?}
    C -->|Yes| D[Save to database]
    C -->|No| E[Show validation errors]
    B --> F[Send notification email]
    D --> G[Return success response]
    F --> G
    E --> H[Return error response]
```

## Snippet 3: State Machine Flow

```mermaid
flowchart TD
    A[Order created] --> B{Payment received?}
    B -->|Yes| C[Order confirmed]
    B -->|No| D{Timeout 30min?}
    D -->|Yes| E[Order cancelled]
    D -->|No| B
    C --> F[Ship order]
    F --> G{Delivered?}
    G -->|Yes| H[Order completed]
    G -->|No| I[Return to warehouse]
```

## Snippet 4: Database Read/Write + Conditional Branch

```mermaid
flowchart TD
    A[User searches for item] --> B[(Query database)]
    B --> C{Results found?}
    C -->|Yes| D[Render results list]
    C -->|No| E[Show empty state<br/>guide to refine search]
    D --> F{User clicks item?}
    F -->|Yes| G[Load item details]
    F -->|No| H[Return to search]
    G --> I[Show item page]
```
