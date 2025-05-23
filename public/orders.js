async function loadUserOrders() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        alert("Вы не авторизованы!");
        return;
    }

    try {
        const response = await fetch('/api/all-orders', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,  // Токен передается в заголовке
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error("Ошибка при загрузке заказов");
        }

        const orders = await response.json();
        console.log("Полученные заказы:", orders);  // Для проверки

        displayOrders(orders);  // Отображаем заказы

    } catch (error) {
        console.error("Ошибка при загрузке заказов:", error);
        alert("Не удалось загрузить заказы.");
    }
}
function displayOrders(orders) {
    const ordersContainer = document.getElementById('ordersContainer');
    const noOrdersMessage = document.getElementById('noOrdersMessage');
    
    if (orders.length === 0) {
        noOrdersMessage.style.display = 'block';
        ordersContainer.style.display = 'none';
        return;
    } else {
        noOrdersMessage.style.display = 'none';
        ordersContainer.style.display = 'block';
    }

    // Сортировка от новых к старым
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    ordersContainer.innerHTML = '';

    orders.forEach(order => {
        const itemsList = order.items.map(item => {
            if (item.productId && item.productId.name) {
                return `<li>${item.productId.name} — ${item.quantity} шт. (${item.price} ₽)</li>`;
            } else {
                return `<li>Товар не найден</li>`;
            }
        }).join('');

        let orderHTML = `
            <div class="order">
                <h3>Заказ №${order._id.slice(0, 8)}</h3>
                <p>Пользователь: ${order.userId?.username || 'Неизвестно'}</p>
                <p>Адрес: ${order.address}</p>
                <p>Дата оформления: ${new Date(order.createdAt).toLocaleDateString()} ${new Date(order.createdAt).toLocaleTimeString()}</p>
                <p>Время доставки: ${order.deliveryTime || 'Не указано'}</p>
                <p>Общая сумма: ${order.totalAmount} ₽</p>
        `;

        if (order.additionalInfo) {
            orderHTML += `<p>Дополнительная информация: ${order.additionalInfo}</p>`;
        }

        orderHTML += `<ul>${itemsList}</ul></div><hr>`;

        ordersContainer.innerHTML += orderHTML;
    });
}

// Загрузка заказов при загрузке страницы
document.addEventListener("DOMContentLoaded", loadUserOrders);
