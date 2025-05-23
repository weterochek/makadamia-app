const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Products");
const authMiddleware = require("../middleware/authMiddleware");

// Создание заказа
router.post("/order", authMiddleware, async (req, res) => {
    try {
        const { items, address, additionalInfo } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Корзина не может быть пустой" });
        }

        const populatedItems = [];
        let totalAmount = 0;

        for (let item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Товар с id ${item.productId} не найден` });
            }
            populatedItems.push({
                productId: product._id,
                quantity: item.quantity,
                price: product.price
            });
            totalAmount += product.price * item.quantity;
        }

        const newOrder = new Order({
            userId: req.user.id,
            name: req.user.username,
            address,
            deliveryTime: req.body.deliveryTime, // Добавляем время доставки
            additionalInfo,
            items: populatedItems,
            totalAmount,
            createdAt: new Date()
        });

        await newOrder.save();
        res.status(201).json({ message: "Заказ успешно оформлен", order: newOrder });
    } catch (error) {
        console.error("❌ Ошибка при сохранении заказа:", error);
        res.status(500).json({ message: "Ошибка сервера", error: error.message });
    }
});

// Получение всех заказов
router.get("/orders", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;  // Получаем userId из токена

        const orders = await Order.find({ userId })
            .populate("items.productId", "name price")  // Загружаем имя и цену продукта
            .exec();  // Выполняем запрос

        res.status(200).json(orders);  // Возвращаем заказы
    } catch (error) {
        console.error("Ошибка при загрузке заказов:", error);
        res.status(500).json({ message: "Ошибка сервера при загрузке заказов" });
    }
});



// Получение заказов текущего пользователя
router.get("/user-orders", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id; // Получаем userId из токена (authMiddleware)
        console.log("Запрос на заказы пользователя:", userId);  // Логирование

        const orders = await Order.find({ userId }).populate("items.productId", "name price");
        console.log("Найдено заказов:", orders.length);  // Логирование

        res.status(200).json(orders);  // Отправляем заказы
    } catch (error) {
        console.error("Ошибка при загрузке заказов:", error);  // Логирование ошибки
        res.status(500).json({ error: "Ошибка при загрузке заказов пользователя" });
    }
});


// Получение всех заказов (например, для админов)
// Все заказы для админки или orders.html
router.get("/all-orders", async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("userId", "username")  // Чтобы видеть, кто заказал
            .populate("items.productId", "name price");

        res.status(200).json(orders);
    } catch (error) {
        console.error("Ошибка при загрузке всех заказов:", error);
        res.status(500).json({ message: "Ошибка сервера при загрузке всех заказов" });
    }
});


// Обновление статуса заказа
router.put("/order/:id", authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        await Order.findByIdAndUpdate(req.params.id, { status });
        res.json({ message: "Статус заказа обновлен" });
    } catch (error) {
        console.error("Ошибка обновления статуса заказа:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

module.exports = router;
