I need to create a typescript migration script that uses postgres `pg` module to connect to the legacy postgres database and create a normalized, well designed data model to use with AI via a supabase database that is self-hosted.  The postgres source database is horribly designed and based on the django contentypes model for managing relationships, which makes it extremely hard to traverse the data to make sense of it.  

To prepare, I need to resolve how to create a well designed target data model for the following objects:

1. doctors
2. offices
3. technicians
4. patients
5. order types
6. orders
7. messages
8. comments
9. instructions
10. products
11. projects
12. tasks

## Offices

The source tables to assemble an office record are:

* dispatch_office

An office has a number of doctors associated with it.  These offices are the customers of Brius, who buy the braces for their patients.

## Doctors

The source tables to assemble doctor data from the legacy database are:

* dispatch_office_doctors
* auth_user

Doctors are part of an office, and they can prescribe orthodontics for patients as a course of treatment.

## Orders, Order States, and Order Types
Orders are made as part of a course of treatment.  Order types are found in the `dispatch_course` table, but only the following records are actually an"order type":
* Main (a new orthodontic)
* Refinement (a correction or addition where a Main type exists)
* Replacement (a replacement of a broken item where a main type exists)

The new `order_type` table in the supabase database should have the following columns:

* id, UUID, primary key
* name, derive from the types list above, text, unique index
* key, a unique short form name (kebab case), text, unique index
* schema, JSONB, nullable--a potential JSON schema to handle extra data in the instance's `data` JSONB column to enforce the schema (optional)

The other tables that relate to orders from the source database:

* dispatch_instruction, which are instructions in response to a course that kick off the process. the `patient_id` denotes the patient this is for, and we should retain this field value to maintain a backlink to the old database but enforce relationships with the `id`  UUID value of the new patient record in the new table.
* dispatch_project, which keeps track of the "project" artifacts that are used in the manufacturing of the equipment sold.

### Order States are derived from the combined contents of the following tables, from which a set of states can be created and referenced:

* dispatch_records: generic records have messages in them that indicate changes in state, messages of certain types mark these state changes.
* dispatch_state: the status, instruction_id, fields are used to map the current status to orders etc.

### Orders
Pull order information from the dispatch_instructions table, which will be linked to projects, tasks, etc. for that order.

Order fields should at least have:

* id, UUID, primary key
* order_type, UUID, foreign key to order_type table
* data, JSONB, nullable, possible extra data
* all other records derived from the collection of records from the legacy database.  You will need to investigate and collect these.

The `dispatch_order` table from the source is of no use and is empty.  Ignore it.

## Technicians, patients, doctors, masters, sales people,  etc. all have a record in auth_user, although in the new system none of these people will be users.  Any table containing a foreign key link back to `auth_users` is a potential type of "person" or "persona" (if they have personal data in that table--like email addresses, etc.).

You need to find all those instances, find the fields we need from them and put those in to the proposed target data model.

The `dispatch_records` tables have all the messages and message types used to track communication about orders.  You need to derive a schema for `messages` and `message types` from the data in those tables.  The `django_contenttypes` table is linked to this one in one of the fields, so this should help.

the `django_contenttypes` table has the list of all the possible entitie.  We need ,first, a target supabase/postgres data model that is well structured, accounts for the type of embeddings tables and records that make sense for use with RAG, etc.  Use the MCP server to gather the necessary information and create a markdown document artifact that represents the optimal target data model based on these specifications to support queries, generative AI, reporting, etc.