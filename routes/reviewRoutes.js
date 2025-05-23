const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const Review = require("../models/Review");

const router = express.Router();

// Получить все отзывы
router.get("/", async (req, res) => {
    try {
        const reviews = await Review.find();
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

// Добавить отзыв (только авторизованные пользователи)
router.post("/", protect, async (req, res) => {
    const { rating, comment, name } = req.body;
    const user = req.user; // Авторизованный пользователь

    try {
        const review = new Review({
            user: user._id,
            username: name || user.username, // Используем переданное имя или username пользователя
            rating,
            comment,
        });

        await review.save();
        res.json({ success: true, message: "Отзыв добавлен!", review });
    } catch (error) {
        console.error("Ошибка при сохранении отзыва:", error);
        res.status(500).json({ success: false, message: "Ошибка при сохранении отзыва" });
    }
});

module.exports = router;
