let cart = {};
let isSubmittingOrder = false;

function getToken() {
    return localStorage.getItem("accessToken");
}

document.addEventListener("DOMContentLoaded", () => {
    const cartItemsContainer = document.getElementById("cartItems");
    const totalAmountElement = document.getElementById("totalAmount");
    const checkoutForm = document.getElementById("checkoutForm");
    const backToShoppingButton = document.getElementById("backToShopping");

    // Загружаем корзину из localStorage
    cart = JSON.parse(localStorage.getItem('cart')) || {};

    // Отображаем товары в корзине
    function renderCartItems() {
        cartItemsContainer.innerHTML = '';
        let totalAmount = 0;

        for (const productId in cart) {
            const item = cart[productId];
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <div class="item-info">${item.name}</div>
                <div class="item-price">${item.price} ₽</div>
                <div class="quantity-controls">
                    <button class="quantity-control decrease-quantity" data-id="${productId}">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-control increase-quantity" data-id="${productId}" ${item.quantity >= 100 ? 'disabled' : ''}>+</button>
                </div>
            `;
            cartItemsContainer.appendChild(itemElement);
            totalAmount += item.price * item.quantity;
        }

        totalAmountElement.textContent = `Итого: ${totalAmount} ₽`;
    }

    // Обработчики для изменения количества товаров
    cartItemsContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (!target.classList.contains('quantity-control')) return;

        const productId = target.dataset.id;
        if (!cart[productId]) return;

        if (target.classList.contains('increase-quantity')) {
            // Проверяем, не превышает ли текущее количество максимальное
            if (cart[productId].quantity < 100) {
                cart[productId].quantity++;
            }
        } else if (target.classList.contains('decrease-quantity')) {
            cart[productId].quantity--;
            if (cart[productId].quantity <= 0) {
                delete cart[productId];
            }
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        renderCartItems();
    });

    // Загрузка данных пользователя
    async function loadUserData() {
        const token = getToken();
        if (!token) {
            console.log("Пользователь не авторизован");
            return;
        }

        try {
            const response = await fetch("https://makadamia-app-etvs.onrender.com/account", {
                method: "GET",
                credentials: "include",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.status === 401) {
                // Если токен истек или недействителен, пробуем обновить его
                const refreshResult = await refreshToken();
                if (refreshResult) {
                    // Если обновление успешно, повторяем запрос с новым токеном
                    const newToken = getToken();
                    const newResponse = await fetch("https://makadamia-app-etvs.onrender.com/account", {
                        method: "GET",
                        credentials: "include",
                        headers: {
                            "Authorization": `Bearer ${newToken}`,
                            "Content-Type": "application/json"
                        }
                    });
                    if (newResponse.ok) {
                        const userData = await newResponse.json();
                        updateFormWithUserData(userData);
                        return;
                    }
                }
                // Если обновление не удалось, продолжаем без данных пользователя
                console.log("Не удалось обновить токен");
                return;
            }

            if (!response.ok) {
                throw new Error("Ошибка при загрузке данных профиля");
            }

            const userData = await response.json();
            updateFormWithUserData(userData);
        } catch (error) {
            console.error("Ошибка загрузки данных профиля:", error);
        }
    }
function formatDateTime(raw) {
  const date = new Date(raw);
  if (isNaN(date)) return raw; // если нераспознаваемая дата — вернуть как есть

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
    // Функция для обновления токена
    async function refreshToken() {
        try {
            const response = await fetch("https://makadamia-app-etvs.onrender.com/refresh", {
                method: "POST",
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('accessToken', data.accessToken);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Ошибка при обновлении токена:", error);
            return false;
        }
    }

    // Функция для обновления формы данными пользователя
    function updateFormWithUserData(userData) {
        if (userData.name) {
            document.getElementById("customerName").value = userData.name;
        }
        if (userData.city) {
            document.getElementById("customerAddress").value = userData.city;
        }
    }

    // Оформление заказа
    if (checkoutForm) {
        // Обработчик кнопки "Оформить заказ"
        checkoutForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Проверяем, не отправляется ли уже заказ
            if (isSubmittingOrder) {
                console.log("Заказ уже отправляется...");
                return;
            }

            const token = getToken();
            if (!token) {
                alert("Вы не авторизованы!");
                return;
            }

            // Получаем кнопку отправки
            const submitButton = checkoutForm.querySelector('button[type="submit"]');
            
            try {
                // Устанавливаем флаг отправки и блокируем кнопку
                isSubmittingOrder = true;
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = "Оформляем заказ...";
                }
const phoneInput = document.getElementById("customerPhone");
if (!phoneInput || !phoneInput.value.trim()) {
  alert("Пожалуйста, введите номер телефона.");
  return;
}

const orderData = {
  name: document.getElementById("customerName").value,
  address: document.getElementById("customerAddress").value,
  deliveryTime: new Date(document.getElementById("deliveryTime").value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }),
  additionalInfo: document.getElementById("additionalInfo").value,
  phone: phoneInput.value.trim(),
  totalAmount: Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0),
  items: Object.keys(cart).map(productId => ({
    productId: productId,
    quantity: cart[productId].quantity,
    price: cart[productId].price
  }))
};
                const response = await fetch("https://makadamia-app-etvs.onrender.com/api/order", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(orderData)
                });

                if (!response.ok) {
                    throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
                }

                const responseData = await response.json();
                alert("🎉 Заказ успешно оформлен!");

                // Очистка корзины после успешного оформления
                cart = {};  // Очищаем корзину
                localStorage.removeItem('cart');  // Удаляем корзину из localStorage
                renderCartItems();  // Обновляем отображение корзины
                window.location.href = "account.html";  // Перенаправление на страницу спасибо

            } catch (error) {
                console.error("Ошибка при оформлении заказа:", error);
                alert("Ошибка при оформлении заказа.");
            } finally {
                // Сбрасываем флаг отправки и разблокируем кнопку
                isSubmittingOrder = false;
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Оформить заказ";
                }
            }
        });
    }

    // Кнопка "Вернуться к покупкам"
    if (backToShoppingButton) {
        backToShoppingButton.addEventListener('click', () => {
            window.location.href = "index.html";
        });
    }

    // Инициализация
    renderCartItems();
    loadUserData();
});
