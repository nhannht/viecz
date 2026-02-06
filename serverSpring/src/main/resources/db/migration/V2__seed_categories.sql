-- Seed categories for Viecz platform
-- Vietnamese university student job marketplace

INSERT INTO categories (name, name_vi, icon, is_active) VALUES
('Moving & Transport', 'Vận chuyển & Di chuyển', '🚚', TRUE),
('Delivery', 'Giao hàng', '📦', TRUE),
('Assembly & Installation', 'Lắp ráp & Cài đặt', '🔧', TRUE),
('Cleaning', 'Dọn dẹp', '🧹', TRUE),
('Tutoring & Teaching', 'Gia sư & Giảng dạy', '📚', TRUE),
('Tech Support', 'Hỗ trợ kỹ thuật', '💻', TRUE),
('Event Help', 'Hỗ trợ sự kiện', '🎉', TRUE),
('Shopping & Errands', 'Mua sắm & Việc vặt', '🛒', TRUE),
('Pet Care', 'Chăm sóc thú cưng', '🐾', TRUE),
('Photography', 'Chụp ảnh', '📸', TRUE),
('Other', 'Khác', '✨', TRUE)
ON CONFLICT DO NOTHING;
