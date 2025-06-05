require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const Joi = require("joi");
const app = express();
const orderRoutes = require("./routes/orderRoutes");
const { protect } = require('./middleware/authMiddleware');
const Order = require('./models/Order');
const User = require('./models/User');
const Product = require("./models/Products");  
const Review = require('./models/Review');
const sendEmail = require("./utils/sendEmail");


// Настройка CORS
const allowedOrigins = [
  'https://makadamia-app-etvs.onrender.com',
  'http://localhost:3000' // Для локальной разработки
];

console.log("Отправка запроса на /refresh");

const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            "https://makadamia-app-etvs.onrender.com",
            "http://localhost:3000"
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true, // Обязательно для передачи s!
};
app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use('/api', orderRoutes);
// Подключение к MongoDB
const JWT_SECRET = process.env.JWT_SECRET || "ai3ohPh3Aiy9eeThoh8caaM9voh5Aezaenai0Fae2Pahsh2Iexu7Qu/";
const mongoURI = process.env.MONGO_URI || "mongodb://11_ifelephant:ee590bdf579c7404d12fd8cf0990314242d56e62@axs-h.h.filess.io:27018/11_ifelephant";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "J8$GzP1d&KxT^m4YvNcR";
const EMAIL_SECRET = process.env.EMAIL_SECRET || "acd2a2731fa3dcfed127e09da89a804e1caf9e0fb662ae018e46c372b3130246dd4218e44c3602e52367ac90e9b1831ecc380fcea8cd44f2c2a116996a42f8c3";
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: false, // Включено SSL
})
  .then(() => console.log("MongoDB connected"))
  .catch((error) => console.error("MongoDB connection error:", error));

// Middleware для обработки JSON

// Функция проверки срока жизни токена
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split(".")[1])); // Декодируем токен
        return payload.exp * 1000 < Date.now(); // Если exp в прошлом — токен истёк
    } catch (e) {
        return true; // Если ошибка — токен недействителен
    }
}


// Перенаправление HTTP на HTTPS
app.use((req, res, next) => {
    if (process.env.NODE_ENV === "production") {
        console.log("Проверка протокола:", req.headers["x-forwarded-proto"]);
        if (req.headers["x-forwarded-proto"] !== "https") {
            console.log("🔄 Перенаправление на HTTPS...");
            return res.redirect(`https://${req.headers.host}${req.url}`);
        }
    }
    next();
});

const Cart = require("./models/Cart"); // Подключаем модель

app.post('/cart/add', protect, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Авторизуйтесь, чтобы добавить товар в корзину' });
    }

    const { productId, quantity } = req.body;
    const userId = req.user.id;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItem = cart.items.find(item => item.productId.toString() === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }

    await cart.save();
    res.status(200).json({ message: "Товар добавлен в корзину", cart });

  } catch (error) {
    console.error("Ошибка добавления в корзину:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

// Указание папки со статическими файлами
app.use(express.static(path.join(__dirname, "public")));

// Маршрут для получения товара по ID
app.get('/s/:id', async (req, res) => {
  try {
    const product = await Products.findById(req.params.id); // Используется Products, так как это ваша модель
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);  // Отправляем товар
  } catch (error) {
    console.error("Ошибка при получении товара:", error);
    res.status(500).json({ message: 'Ошибка при получении товара' });
  }
});
app.post("/update-account", async (req, res) => {
  const { userId, name, city, email } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "Пользователь не найден" });

  user.name = name ?? user.name;
  user.city = city ?? user.city;

  // 👇 проверим, поменяли ли email
  if (email && email !== user.email) {
  user.pendingEmail = email;
  user.emailVerified = false;

  const token = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = token;
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

  const verifyUrl = `https://makadamia-app-etvs.onrender.com/verify-email?token=${token}&email=${email}`;

  await transporter.sendMail({
    from: '"Makadamia" <seryojabaulin25@gmail.com>',
    to: email,
    subject: "Подтверждение нового email",
    html: `
      <h2>Подтвердите новую почту</h2>
      <p>Нажмите <a href="${verifyUrl}">сюда</a>, чтобы подтвердить email: <b>${email}</b>.</p>
      <p><small>Срок действия — 24 часа.</small></p>
    `
  });
}

  await user.save();
  res.json({ message: "Данные обновлены", user });
});
app.get('/api/products', async (req, res) => {
    try {
        const products = await Products.find();  // Используется Products, так как это ваша модель
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: "Ошибка получения списка продуктов" });
    }
});

app.post("/account/email-change", protect, async (req, res) => {
  const { email } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  // Ограничение: не чаще 1 раза в минуту
  const now = Date.now();
  const lastSent = user.emailVerificationLastSent || 0;

  if (now - lastSent < 60 * 1000) {
    return res.status(429).json({
      message: "⏱ Повторная отправка письма возможна через 1 минуту."
    });
  }

  const token = crypto.randomBytes(32).toString("hex");

  user.pendingEmail = email;
  user.emailVerificationToken = token;
  user.emailVerificationExpires = now + 24 * 60 * 60 * 1000; // 24 часа
  user.emailVerificationLastSent = now;

  await user.save();

  const verifyUrl = `https://makadamia-app-etvs.onrender.com/verify-email?token=${token}&email=${email}`;

  await sendEmail(email, "Подтверждение нового email", `
    <h2>Подтвердите новую почту</h2>
    <p>Нажмите <a href="${verifyUrl}">сюда</a>, чтобы подтвердить email: <b>${email}</b>.</p>
    <p><small>Срок действия — 24 часа.</small></p>
  `);

  res.json({ email: user.email }); // возвращаем старую (подтверждённую) почту
});
// Получение всех заказов
app.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find().populate('items.productId');
        res.json(orders);
    } catch (err) {
        console.error("❌ Ошибка получения заказов:", err);
        res.status(500).json({ message: "Ошибка получения заказов" });
    }
});
app.post("/api/order", protect, async (req, res) => {
    try {
        const { items, address, additionalInfo, createdAt, phone } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Корзина не может быть пустой" });
        }

        const newOrder = new Order({
            userId: req.user.id,
            address,
            additionalInfo,
            phone,
            items,
            createdAt,
        });

        await newOrder.save();

        res.status(201).json({ message: "Заказ успешно оформлен", order: newOrder });
    } catch (error) {
        console.error("Ошибка при создании заказа:", error);
        res.status(500).json({ message: "Ошибка при создании заказа", error: error.message });
    }
});
//почта
app.post("/update-email", protect, async (req, res) => {
  const userId = req.user.id;
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email обязателен" });

  try {
    const user = await User.findById(userId);
    user.email = email;
    await user.save();
    res.status(200).json({ message: "Email обновлён" });
  } catch (err) {
    res.status(500).json({ message: "Ошибка сервера" });
  }
});
const transporter = nodemailer.createTransport({
  service: "gmail", // или 'yandex', 'mail.ru', 'smtp.yourhost.com'
  auth: {
    user: "seryojabaulin25@gmail.com",     // ← ТВОЙ EMAIL
    pass: "exwtwuflxjzonrpa"         // ← Пароль или App Password
  }
});
app.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "Пользователь с этой почтой не найден" });
  }

  const token = crypto.randomBytes(32).toString('hex');
  user.resetToken = token;
  user.resetTokenExpiration = Date.now() + 15 * 60 * 1000;
  await user.save();

  const resetLink = `https://makadamia-app-etvs.onrender.com/reset.html?token=${token}`;

await transporter.sendMail({
  from: '"Makadamia Support" <your_email@gmail.com>', // от кого
  to: user.email, // кому
  subject: "Восстановление пароля",
  html: `
    <h3>Здравствуйте, ${user.username}!</h3>
    <p>Вы запросили восстановление пароля на сайте Makadamia.</p>
    <p>Перейдите по ссылке ниже, чтобы задать новый пароль:</p>
    <a href="${resetLink}">${resetLink}</a>
    <p><small>Ссылка активна в течение 15 минут.</small></p>
  `
});

res.json({ message: "Письмо с ссылкой отправлено на почту" });
});
app.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ message: "Ссылка устарела или недействительна" });
  }

  user.password = await bcrypt.hash(password, 12);
  user.resetToken = undefined;
  user.resetTokenExpiration = undefined;
  await user.save();

  res.json({ message: "Пароль успешно обновлён" });
});


// Получение заказов пользователя
app.get('/user-orders/:userId', protect, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.params.userId }).populate("items.productId", "name price");
        res.json(orders);
    } catch (error) {
        console.error("Ошибка при получении заказов:", error);
        res.status(500).json({ message: "Ошибка при получении заказов" });
    }
});


function generateTokens(user, site) {
    const issuedAt = Math.floor(Date.now() / 1000);
    
    const accessToken = jwt.sign(
        { id: user._id, username: user.username, site: "https://makadamia-app-etvs.onrender.com", iat: issuedAt },
        JWT_SECRET,
        { expiresIn: "30m" }  // ⏳ Access-токен на 30 минут
    );

    const refreshToken = jwt.sign(
        { id: user._id, username: user.username, site: "https://makadamia-app-etvs.onrender.com", iat: issuedAt },
        REFRESH_SECRET,
        { expiresIn: "30d" }  // 🔄 Refresh-токен на 7 дней
    );

    return { accessToken, refreshToken };
}




// Регистрация пользователя
app.post('/register', async (req, res) => {
  const schema = Joi.object({
    username: Joi.string().trim().min(3).max(30).required(),
    password: Joi.string().min(8).required(),
    email: Joi.string().email().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { username, password, email } = req.body;

  try {
    console.log("Регистрация пользователя:", username);
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Пользователь с таким именем уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const token = crypto.randomBytes(32).toString("hex");

const newUser = new User({
  username,
  password: hashedPassword,
  email,
  emailVerified: false,
  emailVerificationToken: token,
  emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 часа
});

await newUser.save();

const verifyUrl = `https://makadamia-app-etvs.onrender.com/verify-email?token=${token}&email=${email}`;

await transporter.sendMail({
  from: '"Makadamia" <seryojabaulin25@gmail.com>',
  to: email,
  subject: "Подтверждение почты",
  html: `
    <h2>Подтвердите вашу почту</h2>
    <p>Нажмите <a href="${verifyUrl}">сюда</a>, чтобы подтвердить email.</p>
    <p><small>Срок действия ссылки — 24 часа.</small></p>
  `
});

return res.status(201).json({
  message: 'Письмо для подтверждения отправлено на почту. Подтвердите, чтобы войти.'
});


  } catch (err) {
    console.error("Ошибка регистрации:", err);
    return res.status(500).json({ message: 'Ошибка регистрации пользователя', error: err.message });
  }
});
app.get("/verify-email", async (req, res) => {
  const { token, email } = req.query;

  if (!token || !email) {
    return res.status(400).send("Некорректный запрос.");
  }

  const user = await User.findOne({
    email,
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).send("Ссылка устарела или недействительна.");
  }

user.emailVerified = true;
if (user.pendingEmail) {
  user.email = user.pendingEmail;
  user.pendingEmail = null;
}
user.emailVerificationToken = undefined;
user.emailVerificationExpires = undefined;
  await user.save();

  return res.send("✅ Почта успешно подтверждена. Теперь вы можете войти.");
});
// Авторизация пользователя
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Неверные данные' });
    }

    const { accessToken, refreshToken } = generateTokens(user);

// Устанавливаем refreshToken как cookie (для WebView и браузеров)
res.cookie("refreshTokenAPP", refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000 // ✅ 30 дней в миллисекундах
});

// Отправляем только accessToken и userId
res.json({
    accessToken,
    userId: user._id
});
});

// Обработка запроса на обновление токена для ПК-версии
app.post('/refresh', async (req, res) => {
    const refreshToken = req.cookies.refreshTokenAPP;

    if (!refreshToken) {
        console.error("❌ Refresh-токен отсутствует в cookies");
        return res.status(401).json({ message: "Не авторизован" });
    }

    console.log("🔍 Полученный refreshToken:", refreshToken);
    
    jwt.verify(refreshToken, REFRESH_SECRET, async (err, decoded) => {
        if (err) {
            console.error("❌ Ошибка проверки refresh-токена:", err.message);
            
            res.clearCookie("refreshTokenAPP", {
                httpOnly: true,
                secure: true,
                sameSite: "None",
                path: "/"
            });

            return res.status(403).json({ message: "Refresh-токен недействителен или истёк" });
        }

        if (!decoded.exp || (decoded.exp * 1000 < Date.now())) {
            console.error("❌ Refresh-токен окончательно истёк!");
            res.clearCookie("refreshTokenAPP", { path: "/" });
            return res.status(403).json({ message: "Refresh-токен истёк" });
        }

        try {
            const user = await User.findById(decoded.id);
            if (!user) {
                console.error("❌ Пользователь не найден по ID:", decoded.id);
                return res.status(404).json({ message: "Пользователь не найден" });
            }

const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
res.cookie("refreshTokenAPP", newRefreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000
});

            console.log("✅ Refresh-токен обновлён успешно");

            // 🚀 Отключаем кеширование
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");

            res.json({ accessToken });

        } catch (error) {
            console.error("❌ Ошибка при поиске пользователя:", error);
            return res.status(500).json({ message: "Ошибка сервера" });
        }
    });
});


app.post('/logout', (req, res) => {
    console.log("🔄 Выход из аккаунта...");
    
    res.clearCookie("refreshTokenAPP", {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        path: "/",
        domain: "makadamia-app-etvs.onrender.com"
    });

    res.json({ message: 'Вы вышли из системы' });
});


// Обновление токена
app.post('/-token', (req, res) => {
  const { token: Token } = req.body;

  if (!Token) {
    return res.status(403).json({ message: 'Токен обновления не предоставлен' });
  }

  try {
    const user = jwt.verify(Token, JWT_SECRET);
    const newAccessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: 'Недействительный токен обновления' });
  }
});

// Приватный маршрут
app.get('/private-route', protect, (req, res) => {
  res.json({ message: `Добро пожаловать, пользователь ${req.user.id}` });
});
app.get('/account', protect, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Не авторизован" });
        }

        const user = await User.findById(req.user.id).select("username name city email");
        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }
              // 🚀 Отключаем кеширование
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        res.json({
  username: user.username,
  name: user.name,
  city: user.city,
  email: user.email  // ← добавь это
});
    } catch (error) {  // ✅ Добавляем обработку ошибки
        console.error("Ошибка при загрузке аккаунта:", error);
        res.status(500).json({ message: "Ошибка сервера", error: error.message });
    }
});
app.put("/account", protect, async (req, res) => {
  const { name, city, email, username, password } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Пользователь не найден" });

    if (name) user.name = name;
    if (city) user.city = city;
    if (email) user.email = email;
    if (username) user.username = username;
    if (password) user.password = await bcrypt.hash(password, 12);

    await user.save();
    res.json({ message: "Аккаунт обновлён", user });
  } catch (error) {
    res.status(500).json({ message: "Ошибка обновления", error: error.message });
  }
});
// Обработка корневого маршрута
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Проверка соединения
app.get("/connect", (req, res) => {
  res.send("Соединение с сервером успешно!");
});

// Маршрут для получения отзывов
app.get('/api/reviews', async (req, res) => {
    try {
        const { rating } = req.query;
        let query = {};
        
        if (rating && rating !== 'all') {
            query.rating = parseInt(rating);
        }
        
        const reviews = await Review.find(query)
            .sort({ date: -1 })
            .populate('userId', 'username');
            
        res.json(reviews);
    } catch (error) {
        console.error("Ошибка при получении отзывов:", error);
        res.status(500).json({ message: "Ошибка при получении отзывов" });
    }
});

// Маршрут для создания отзыва
app.post('/api/reviews', protect, async (req, res) => {
    try {
        const { rating, comment, displayName } = req.body;
        
        if (!rating || !comment) {
            return res.status(400).json({ message: "Рейтинг и комментарий обязательны" });
        }
        
        const review = new Review({
            rating,
            comment,
            displayName,
            userId: req.user.id,
            username: req.user.username,
            date: new Date()
        });
        
        await review.save();
        res.status(201).json(review);
    } catch (error) {
        console.error("Ошибка при создании отзыва:", error);
        res.status(500).json({ message: "Ошибка при создании отзыва" });
    }
});

// Обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Что-то пошло не так!', error: err.message });
});

// Обработка 404 ошибок
app.use((req, res) => {
  res.status(404).json({ message: "Ресурс не найден" });
});

// Порт, на котором будет работать сервер
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
