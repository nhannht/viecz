-- Remove seeded categories
DELETE FROM categories WHERE name IN (
    'Dọn dẹp',
    'Giao hàng',
    'Gia sư',
    'Sửa chữa',
    'Nấu ăn',
    'Chăm sóc thú cưng',
    'Thiết kế',
    'Lập trình',
    'Viết bài',
    'Chụp ảnh'
);
