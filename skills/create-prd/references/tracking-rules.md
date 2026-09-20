# Tracking Design Rules

## Bidirectional Traceability Strict Validation

### Forward Traceability (Success Metric → Tracking Event)

Each success metric must meet both:
1. Has a calculation formula in section 8.3 "Success Metric Calculation Method"
2. The calculation formula references at least one tracking event ID (BT-x.x)

**Missing → Critical**: Without calculation method or tracking event reference, the metric is unmeasurable.

### Reverse Traceability (Tracking Event → Success Metric)

Each tracking event must meet both:
1. "Serves Which Success Metric" column is non-empty
2. The referenced success metric exists in Chapter 2

**Empty → Critical**: Tracking event has no serving target, violates the 1:1 mandatory rule. Must be deleted or associated with a success metric.

## Tracking Event Numbering Format

| Format | Description |
| ------ | ----------- |
| BT-{chapter}.{sequence} | BT-1.1, BT-1.2, BT-2.1... |
| Chapter number | Corresponds to the feature chapter number |
| Sequence | Sequential within chapter |

**Example**:
- BT-1.1: First tracking event for Chapter 1 features
- BT-2.1: First tracking event for Chapter 2 features

## Tracking Event List Table Format

| Column | Description | Example |
| ------ | ----------- | ------- |
| Event ID | BT-x.x numbering | BT-1.1 |
| Event Name | Snake_case event name | `favorite_add` |
| Trigger Condition | When this event fires | "User clicks favorite button successfully" |
| Serves Which Success Metric | Corresponding success metric | "Favorites usage rate" |
| Key Business Fields | Fields captured with event | user_id, floorplan_id, community_name |

### Key Business Field Format

Fields should be comma-separated, include at minimum:
- User identifier (user_id)
- Business object identifier (floorplan_id, order_id, etc.)
- Context fields (community_name, timestamp, etc.)

## Success Metric Calculation Method Table Format

| Column | Description | Example |
| ------ | ----------- | ------- |
| Success Metric | Metric name from section 2.1 | "Favorites usage rate" |
| Calculation Method | Specific formula | "Users who triggered BT-1.3 in 7 days / 7-day active users" |
| Tracking Events Used | Which BT-x.x events | "BT-1.3 (deduplicated user_id)" |

## CSAT Research Plan (Optional)

| Item | Description |
| ---- | ----------- |
| Research Timing | When to survey (e.g., "7 days after feature launch") |
| Survey Question | Specific question text |
| Target Score | Target CSAT score (e.g., "> 4.0/5.0") |

**When to include**: User-facing features with significant UX impact; skip for internal tools with single operator role.

## Tracking Design Principles

1. **Each metric at least one tracking event**: Unmeasurable metrics are not metrics
2. **Each tracking event serves a metric**: No tracking for tracking's sake
3. **1:1 mandatory correspondence**: **Every tracking event must 1:1 serve at least one success metric in Chapter 2**. Interaction behaviors not directly related to success metrics (e.g., pure UI operations, toast displays, etc.) are not included in the tracking table
4. **Complete business fields**: Tracking events must include all fields needed for calculating metrics
5. **Consistent event naming**: Use snake_case, semantically clear
6. **Clear trigger timing**: Corresponding to specific user operations or system events
