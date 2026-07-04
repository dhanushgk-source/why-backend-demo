-- Customers table (minimal for now — add more fields later as needed)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Orders table
-- id                  -> unique primary key of the order itself
-- customer_id         -> foreign key referencing customers.id
-- customer_name       -> name of the customer placing the booking
-- booking_for         -> who the booking is for (e.g. "self" / "other")
-- care_recipient_name -> name of the person who will receive care
-- age                 -> age of the care recipient
-- gender              -> gender of the care recipient
-- mobile_number       -> contact number for the booking
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  customer_name VARCHAR(255) NOT NULL,
  booking_for VARCHAR(100) NOT NULL,
  care_recipient_name VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL,
  gender VARCHAR(50) NOT NULL,
  mobile_number VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
