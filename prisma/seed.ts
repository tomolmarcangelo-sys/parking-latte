import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data (reverse order of relations)
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.productCustomization.deleteMany({});
  await prisma.customizationChoice.deleteMany({});
  await prisma.customizationGroup.deleteMany({});
  await prisma.productIngredient.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.inventoryItem.deleteMany({});

  // Customization Groups
  const milkGroup = await prisma.customizationGroup.create({
    data: {
      name: 'Milk Type',
      required: true,
      choices: {
        create: [
          { name: 'Whole Milk', priceModifier: 0 },
          { name: 'Oat Milk', priceModifier: 0.75 },
          { name: 'Almond Milk', priceModifier: 0.75 },
          { name: 'Soy Milk', priceModifier: 0.75 },
          { name: 'No Milk', priceModifier: 0 },
        ]
      }
    }
  });

  const sizeGroup = await prisma.customizationGroup.create({
    data: {
      name: 'Size',
      required: true,
      choices: {
        create: [
          { name: 'Regular', priceModifier: 0 },
          { name: 'Large', priceModifier: 1.00 },
        ]
      }
    }
  });

  const sweetenerGroup = await prisma.customizationGroup.create({
    data: {
      name: 'Sweetener',
      required: false,
      choices: {
        create: [
          { name: 'Sugar', priceModifier: 0 },
          { name: 'Honey', priceModifier: 0.50 },
          { name: 'Artificial Sweetener', priceModifier: 0 },
        ]
      }
    }
  });

  const sweetnessLevelGroup = await prisma.customizationGroup.create({
    data: {
      name: 'Sweetness Level',
      required: false,
      choices: {
        create: [
          { name: 'No Sugar', priceModifier: 0 },
          { name: 'Light', priceModifier: 0 },
          { name: 'Regular', priceModifier: 0 },
          { name: 'Extra', priceModifier: 0 },
        ]
      }
    }
  });

  const roastGroup = await prisma.customizationGroup.create({
    data: {
      name: 'Coffee Bean Roast',
      required: false,
      choices: {
        create: [
          { name: 'Light Roast', priceModifier: 0 },
          { name: 'Medium Roast', priceModifier: 0 },
          { name: 'Dark Roast', priceModifier: 0 },
        ]
      }
    }
  });

  const extrasGroup = await prisma.customizationGroup.create({
    data: {
      name: 'Add-ons',
      required: false,
      allowMultiple: true,
      choices: {
        create: [
          { name: 'Extra Espresso Shot', priceModifier: 0.85 },
          { name: 'Vanilla Syrup', priceModifier: 0.50 },
          { name: 'Caramel Drizzle', priceModifier: 0.50 },
          { name: 'Hazelnut Syrup', priceModifier: 0.50 },
          { name: 'Whipped Cream', priceModifier: 0.60 },
        ]
      }
    }
  });

  // Categories
  const coffeeSeries = await prisma.category.create({
    data: { name: 'Coffee Series', products: {
      create: [
        { 
          name: 'Iced Caramel', 
          price: 39, 
          description: 'Smooth espresso blended with buttery caramel and cold milk.', 
          imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80',
          customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: roastGroup.id }, { groupId: extrasGroup.id }] }
        },
        { 
          name: 'Spanish Latte', 
          price: 39, 
          description: 'A creamy sweet delight made with condensed milk and our signature espresso.', 
          imageUrl: 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=600&q=80',
          customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: roastGroup.id }, { groupId: extrasGroup.id }] }
        },
        { 
          name: 'Matcha Coffee', 
          price: 39, 
          description: 'The earthy notes of matcha meeting the bold kick of espresso.', 
          imageUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&q=80',
          customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: roastGroup.id }, { groupId: extrasGroup.id }] }
        },
        { 
          name: 'Oreo Coffee', 
          price: 39, 
          description: 'Crunchy Oreo bits mixed with our house coffee blend.', 
          imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80',
          customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: roastGroup.id }, { groupId: extrasGroup.id }] }
        },
        { 
          name: 'Ube Coffee', 
          price: 39, 
          description: 'A purple twist! Sweet Filipino Ube paired with rich espresso.', 
          imageUrl: 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=600&q=80',
          customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: roastGroup.id }, { groupId: extrasGroup.id }] }
        },
      ]
    }}
  });

  const nonCoffeeSeries = await prisma.category.create({
    data: { name: 'Non-Coffee Series', products: {
      create: [
        { name: 'Iced Chocolate', price: 39, description: 'Rich Dutch cocoa served ice cold.', imageUrl: 'https://images.unsplash.com/photo-1544787210-2211d7c309c7?w=600&q=80', customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: extrasGroup.id }] } },
        { name: 'Spanish Milk', price: 39, description: 'Sweet, creamy condensed milk base without the coffee.', imageUrl: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=600&q=80', customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: extrasGroup.id }] } },
        { name: 'Strawberry Latte', price: 39, description: 'Fresh strawberry puree with creamy milk.', imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80', customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: extrasGroup.id }] } },
        { name: 'Matcha Latte', price: 39, description: 'Premium ceremonial matcha with steamed milk.', imageUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&q=80', customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: extrasGroup.id }] } },
        { name: 'Ube Latte', price: 39, description: 'Creamy purple yam delight.', imageUrl: 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=600&q=80', customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: extrasGroup.id }] } },
        { name: 'Oreo Latte', price: 39, description: 'Sweet milk base with crushed cookie bits.', imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80', customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: extrasGroup.id }] } },
        { name: 'Mango Latte', price: 39, description: 'Tropical mango swirl in creamy milk.', imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80', customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: extrasGroup.id }] } },
        { name: 'Oreo Mango', price: 39, description: 'Unexpectedly delicious combo of cookies and fruit.', imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80', customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: extrasGroup.id }] } },
        { name: 'Blueberry Milk', price: 39, description: 'Velvety milk infused with blueberry sweetness.', imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80', customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: extrasGroup.id }] } },
        { name: 'Berry Matcha', price: 39, description: 'Fruity berries meeting earthy matcha.', imageUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&q=80', customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: extrasGroup.id }] } },
        { name: 'Berry Choco', price: 39, description: 'Deep chocolate with a hint of forest berries.', imageUrl: 'https://images.unsplash.com/photo-1544787210-2211d7c309c7?w=600&q=80', customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: extrasGroup.id }] } },
        { name: 'Ube Matcha', price: 39, description: 'Dual layer of purple yam and green tea.', imageUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&q=80', customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: extrasGroup.id }] } },
        { name: 'Oreo Matcha', price: 39, description: 'Matcha latte with an Oreo crunch.', imageUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&q=80', customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: extrasGroup.id }] } },
        { name: 'Oreo Chocolate', price: 39, description: 'Double the chocolate, double the cookies.', imageUrl: 'https://images.unsplash.com/photo-1544787210-2211d7c309c7?w=600&q=80', customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: extrasGroup.id }] } },
        { name: 'Oreo Ube', price: 39, description: 'Ube purple yam with cookie crumbles.', imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80', customizations: { create: [{ groupId: milkGroup.id }, { groupId: sizeGroup.id }, { groupId: sweetenerGroup.id }, { groupId: sweetnessLevelGroup.id }, { groupId: extrasGroup.id }] } },
      ]
    }}
  });

  // Inventory
  await prisma.inventoryItem.createMany({
    data: [
      { name: 'Espresso Beans', stockLevel: 45, unit: 'kg', lowStockThreshold: 5 },
      { name: 'Whole Milk', stockLevel: 120, unit: 'L', lowStockThreshold: 20 },
      { name: 'Matcha Powder', stockLevel: 10, unit: 'kg', lowStockThreshold: 2 },
      { name: 'Oreo Packs', stockLevel: 50, unit: 'pcs', lowStockThreshold: 10 },
      { name: 'Ube Puree', stockLevel: 15, unit: 'L', lowStockThreshold: 3 },
    ]
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
