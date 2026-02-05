-- Seed script for initial data
-- Run with: psql -U postgres -d viecz -f migrations/seed.sql

-- Insert categories
INSERT INTO categories (name, name_vi, created_at, updated_at) VALUES
('Moving & Transport', 'Vận chuyển & Di chuyển', NOW(), NOW()),
('Delivery', 'Giao hàng', NOW(), NOW()),
('Assembly & Installation', 'Lắp ráp & Cài đặt', NOW(), NOW()),
('Cleaning', 'Dọn dẹp', NOW(), NOW()),
('Tutoring & Teaching', 'Gia sư & Giảng dạy', NOW(), NOW()),
('Tech Support', 'Hỗ trợ kỹ thuật', NOW(), NOW()),
('Event Help', 'Hỗ trợ sự kiện', NOW(), NOW()),
('Shopping & Errands', 'Mua sắm & Việc vặt', NOW(), NOW()),
('Pet Care', 'Chăm sóc thú cưng', NOW(), NOW()),
('Photography', 'Chụp ảnh', NOW(), NOW()),
('Other', 'Khác', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Note: Test user (nhannht) will be created via API /auth/register or via Go seed function
-- Password will be hashed with bcrypt, so cannot be inserted directly via SQL
