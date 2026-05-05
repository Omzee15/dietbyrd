# Backend API Testing Guide

## ✅ Implementation Complete

### Database Tables Created
- ✅ `dietbyrd_food_library` - 30+ nutrition fields
- ✅ `dietbyrd_coupon_codes` - Discount management  
- ✅ `dietbyrd_coupon_usage` - Usage tracking

### API Endpoints Implemented

#### Food Library Endpoints

**GET /api/food-library**
- Get all food items
- Query params: `search`, `category`, `food_type`
```bash
curl http://localhost:3001/api/food-library
curl "http://localhost:3001/api/food-library?category=Cereals"
curl "http://localhost:3001/api/food-library?search=rice"
```

**GET /api/food-library/:id**
- Get single food item
```bash
curl http://localhost:3001/api/food-library/rice-white
```

**POST /api/food-library**
- Create new food item
```bash
curl -X POST http://localhost:3001/api/food-library \
  -H "Content-Type: application/json" \
  -d '{
    "id": "brown-rice",
    "name_en": "Brown Rice",
    "name_hi": "ब्राउन चावल",
    "category": "Cereals",
    "calories": 112,
    "protein": 2.6,
    "carbs": 23.5,
    "fat": 0.9,
    "fiber": 1.8,
    "food_type": "CORE"
  }'
```

**PUT /api/food-library/:id**
- Update food item
```bash
curl -X PUT http://localhost:3001/api/food-library/brown-rice \
  -H "Content-Type: application/json" \
  -d '{
    "calories": 115,
    "protein": 2.7
  }'
```

**DELETE /api/food-library/:id**
- Delete food item
```bash
curl -X DELETE http://localhost:3001/api/food-library/test-food
```

#### Coupon Endpoints

**GET /api/coupons**
- Get all coupons
- Query params: `active_only=true`
```bash
curl http://localhost:3001/api/coupons
curl "http://localhost:3001/api/coupons?active_only=true"
```

**GET /api/coupons/:id**
- Get single coupon
```bash
curl http://localhost:3001/api/coupons/1
```

**POST /api/coupons/validate**
- Validate coupon code and calculate discount
```bash
curl -X POST http://localhost:3001/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SAVE20",
    "order_amount": 2000,
    "user_id": 1
  }'
```

**POST /api/coupons**
- Create new coupon
```bash
curl -X POST http://localhost:3001/api/coupons \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME10",
    "discount_type": "percentage",
    "discount_value": 10,
    "max_discount_amount": 300,
    "min_purchase_amount": 500,
    "usage_limit": 1000,
    "valid_until": "2026-12-31"
  }'
```

**PUT /api/coupons/:id**
- Update coupon
```bash
curl -X PUT http://localhost:3001/api/coupons/1 \
  -H "Content-Type: application/json" \
  -d '{
    "is_active": false
  }'
```

**DELETE /api/coupons/:id**
- Delete coupon
```bash
curl -X DELETE http://localhost:3001/api/coupons/1
```

**POST /api/coupons/:id/apply**
- Apply coupon and track usage
```bash
curl -X POST http://localhost:3001/api/coupons/1/apply \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "patient_id": 123,
    "discount_applied": 200,
    "order_amount": 2000
  }'
```

## Testing Checklist

### Food Library
- [x] GET all foods returns 10+ items
- [x] POST creates new food item
- [x] Search filter works
- [ ] Category filter works
- [ ] PUT updates food item
- [ ] DELETE removes food item
- [ ] Proper error handling for duplicate IDs

### Coupons
- [x] GET returns empty array initially
- [x] POST creates new coupon
- [ ] Validation endpoint calculates discount correctly
- [ ] Usage limits enforced
- [ ] Expiry dates validated
- [ ] Min purchase amount checked
- [ ] Usage tracking increments correctly

## Database Verification

Check tables were created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'dietbyrd_%' 
ORDER BY table_name;
```

Check food library data:
```sql
SELECT id, name_en, category, calories, protein 
FROM dietbyrd_food_library 
LIMIT 5;
```

Check coupon codes:
```sql
SELECT code, discount_type, discount_value, usage_count, usage_limit 
FROM dietbyrd_coupon_codes;
```

## Next Steps

1. **Frontend Integration**: The frontend pages already exist, just start using the API
2. **Food Service Migration**: Update `src/lib/food-service.ts` to use API instead of localStorage
3. **Authentication**: Add auth headers to API requests for user tracking
4. **Bulk Import**: Create CSV upload functionality for bulk food imports
5. **Admin Dashboard**: Test CRUD operations through the UI

## Seed Data

The migration includes 10 common Indian foods:
- White Rice (Cooked)
- Wheat Roti  
- Toor Dal (Cooked)
- Chicken Breast
- Paneer
- Full Cream Milk
- Banana
- Spinach (Raw)
- Whole Egg
- Almonds

## Performance Notes

- All tables have appropriate indexes
- category, food_type, created_by_user_id indexed for fast queries
- Coupon code has unique constraint for fast lookups
- Updated_at triggers automatically maintain timestamps

## Security Considerations

- Validate user permissions before allowing food/coupon modifications
- Sanitize input to prevent SQL injection (using parameterized queries)
- Implement rate limiting for coupon validation endpoint
- Add audit logging for coupon usage
