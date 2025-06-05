require("dotenv").config();
const express = require("express");
const { v4: uuidv4 } = require("uuid");
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
app.get("/api/account", protect, async (req, res) => {
  const user = req.user; // req.user подставляется из middleware `protect`

  if (!user) {
    return res.status(401).json({ message: "Пользователь не найден" });
  }

  res.json({
    username: user.username,
    email: user.email,
    city: user.city,
  });
});

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
// 🔐 Защищённое обновление имени, города и email
app.post("/update-account", protect, async (req, res) => {
  try {
    const { name, city, email } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Пользователь не найден" });

    if (name !== undefined) user.name = name;
    if (city !== undefined) user.city = city;

    if (email !== undefined && email !== user.email) {
      const exists = await User.findOne({ email, _id: { $ne: user._id } });
      if (exists) return res.status(400).json({ message: "Этот email уже используется" });

if (email && email !== user.email) {
  // проверка уникальности
  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(400).json({ message: "Этот email уже используется" });
  }

  user.pendingEmail = email;

  const token = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = token;
  user.emailVerificationExpires = Date.now() + 3600000;

  const verifyLink = `${user.site || "https://makadamia-app-etvs.onrender.com"}/verify-email?token=${token}&email=${email}`;

  await transporter.sendMail({
    to: email,
    subject: "Подтвердите вашу новую почту",
    html: `<p>Подтвердите, перейдя по ссылке: <a href="${verifyLink}">${verifyLink}</a></p>`
  });
}
      user.emailVerificationToken = uuidv4();

      const confirmUrl = `https://makadamia-e0hb.onrender.com/confirm-email-change/${user.emailVerificationToken}`;
      await sendEmail(email, "Подтвердите новую почту", `Перейдите по ссылке для подтверждения: <a href="${confirmUrl}">${confirmUrl}</a>`);

      await user.save();
      return res.json({ message: "Письмо с подтверждением отправлено на новую почту." });
    }

    await user.save();
    res.json({ message: "Данные успешно обновлены" });
  } catch (err) {
    console.error("Ошибка обновления аккаунта:", err);
    res.status(500).json({ message: "Ошибка на сервере" });
  }
});
app.get('/api/products', async (req, res) => {
    try {
        const products = await Products.find();  // Используется Products, так как это ваша модель
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: "Ошибка получения списка продуктов" });
    }
});
// 📩 Подтверждение нового email
app.get("/confirm-email-change/:token", async (req, res) => {
  try {
    const user = await User.findOne({ emailVerificationToken: req.params.token });
    if (!user || !user.pendingEmail) {
      return res.status(400).send("Ссылка недействительна или устарела.");
    }

    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.emailVerificationToken = undefined;
    user.emailVerified = true;
    await user.save();

    res.send("✅ Почта успешно подтверждена. Теперь вы можете войти.");
  } catch (err) {
    console.error("Ошибка подтверждения email:", err);
    res.status(500).send("Ошибка сервера");
  }
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
app.get('/refresh', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Нет токена" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ username: decoded.username });

    if (!user) return res.status(404).json({ message: "Пользователь не найден" });

    res.json({
      username: user.username,
      email: user.email,
      name: user.name,
      city: user.city,
    });
  } catch (err) {
    res.status(500).json({ message: "Ошибка сервера" });
  }
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

