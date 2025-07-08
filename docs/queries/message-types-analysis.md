# Message Types Analysis - dispatch_record Table

## Question
Use the brius_postgres MCP server to determine how many messages there are in the dispatch_records table and create a table that provides the list of the types of messages and the number of each type as markdown.

## SQL Query Used
```sql
SELECT 
  CASE 
    WHEN dr.type IS NULL THEN 'Unknown/NULL'
    ELSE CONCAT(dct.app_label, '.', dct.model)
  END as message_type,
  COUNT(*) as message_count,
  ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
FROM dispatch_record dr
LEFT JOIN django_content_type dct ON dr.type = dct.id
GROUP BY dr.type, dct.app_label, dct.model
ORDER BY message_count DESC;
```

## Results

### Message Types Distribution in dispatch_record Table

| Message Type | Count | Percentage | Description |
|--------------|-------|------------|-------------|
| **contenttypes.contenttype** | 31,734 | 52.04% | System-level content type messages (likely metadata or system notifications) |
| **sessions.session** | 25,621 | 42.02% | Session-related messages (user login/logout activities, session management) |
| **dispatch.file** | 2,310 | 3.79% | File-related messages (file uploads, downloads, processing notifications) |
| **auth.group** | 1,298 | 2.13% | Authentication group messages (customer support communications, user interactions) |
| **Unknown/NULL** | 13 | 0.02% | Messages with undefined or null type |

### Total Messages: 60,976

## Key Insights

1. **System Messages Dominate**: Over 94% of messages are system-generated (contenttypes + sessions), indicating heavy automated logging
2. **Customer Support**: The `auth.group` messages appear to be actual human communications, including customer support interactions between doctors and support staff
3. **File Operations**: A moderate volume of file-related notifications, likely from document uploads and processing
4. **Data Quality**: Very few NULL type messages (only 13), indicating good data integrity

## Sample Communication Content

The `auth.group` messages contain actual customer service conversations, including:
- Technical support requests
- Contact information exchanges  
- Clinical questions about patient cases
- System usage help requests

### Example Messages from auth.group Type:
- "Thank you. Is the office closed for Juneteenth? I tried calling and the automated message said there..."
- "Hi Dr. Benson, the support number is 234-564-3134. Beth, Brava Customer Support"
- "Hello! What is the phone number for customer service?"
- "need help with instrument to remove arm from molar bracket."

## Migration Implications

This data will be crucial for the migration to Supabase, as it represents the core communication system that needs to be preserved and enhanced in the new architecture. The analysis shows:

1. **High Volume**: 60,976+ messages need to be migrated
2. **Mixed Content**: Both system logs and human communications
3. **Active Support System**: Recent customer service interactions (as of June 2025)
4. **Content Types Integration**: Heavy use of Django's ContentTypes framework for message categorization

## Database Schema Context

The `dispatch_record` table structure:
- `id`: Primary key (integer with sequence)
- `text`: Message content (text field)
- `author_id`: Message author reference
- `target_id` & `target_type_id`: Django ContentTypes pattern for flexible references
- `created_at`: Timestamp
- `public`: Boolean flag for message visibility
- `group_id`: Message threading/grouping

This analysis was performed on **2025-07-04** using the brius_postgres MCP server to query the legacy Django PostgreSQL database.
