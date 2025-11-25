// --- SUPABASE CONFIG ---
const SUPABASE_URL = 'https://tprpditlvfacpdbzbcvc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwcnBkaXRsdmZhY3BkYnpiY3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODUyMzMsImV4cCI6MjA3OTE2MTIzM30.KoVU3efYWoeAmWdIgl4cwhLDRgEPsvMKdnzkofGmQC8';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Rate limiting simples
class RateLimiter {
    constructor(maxAttempts = 5, windowMs = 60000) {
        this.maxAttempts = maxAttempts;
        this.windowMs = windowMs;
        this.attempts = new Map();
    }
    canAttempt(key) {
        const now = Date.now();
        const userAttempts = this.attempts.get(key) || [];
        const recentAttempts = userAttempts.filter(time => now - time < this.windowMs);
        if (recentAttempts.length >= this.maxAttempts) return false;
        recentAttempts.push(now);
        this.attempts.set(key, recentAttempts);
        return true;
    }
    reset(key) {
        this.attempts.delete(key);
    }
}
const loginRateLimiter = new RateLimiter(5, 60000);

const showToast = (message) => {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    } else {
        alert(message);
    }
};

// --- CONFIGURAÇÕES ---
const ADMIN_PASSWORD_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
const WHATSAPP_NUMBER = '5585992075321';
const ADMIN_EMAIL = 'cristianofrontend@hotmail.com'; // Exposto para recuperação de senha

document.addEventListener('DOMContentLoaded', () => {
    // --- FUNÇÕES DE SEGURANÇA ---

    // Função para hash SHA-256 (simples, para uso no navegador)
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // Sanitização de inputs
    function sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML.replace(/[<>]/g, '').trim();
    }

    // Validação de dados do menu
    function validateMenuItem(item) {
        if (!item || typeof item !== 'object') return false;
        if (!item.name || typeof item.name !== 'string') return false;
        if (!item.description || typeof item.description !== 'string') return false;
        if (typeof item.price !== 'number') return false;

        const MAX_PRODUCT_NAME_LENGTH = 100;
        const MAX_DESCRIPTION_LENGTH = 500;
        const MIN_PRICE = 0.01;
        const MAX_PRICE = 999.99;

        if (item.name.length > MAX_PRODUCT_NAME_LENGTH) return false;
        if (item.description.length > MAX_DESCRIPTION_LENGTH) return false;
        if (item.price < MIN_PRICE || item.price > MAX_PRICE) return false;

        return true;
    }

    // --- DADOS DO CARDÁPIO (Padrão/Fallback) ---
    const defaultMenuData = {
        hamburgersClassicos: [
            { name: "Clássico Cheddar", description: "Carne grelhada, cream cheddar, molho especial.", price: 15.90, category: 'hamburgersClassicos' },
            { name: "Salada Burguer", description: "Carne grelhada, queijo cheddar, alface, tomate, cebola roxa, picles.", price: 18.50, category: 'hamburgersClassicos' },
            { name: "BBQ Calabresa", description: "Carne grelhada, queijo cheddar, calabresa, alface, tomate, cebola roxa, picles.", price: 19.90, category: 'hamburgersClassicos' },
            { name: "BBQ Bacon", description: "Carne grelhada, molho barbecue, queijo cheddar, bacon, alface, tomate, cebola roxa, picles.", price: 20.00, category: 'hamburgersClassicos' },
            { name: "BBQ MegaTudo", description: "Calabresa, bacon, carne grelhada, queijo cheddar, alface, tomate, cebola roxa, picles, cream cheddar ou cheese ou catupiry + 2 molhos.", price: 29.90, category: 'hamburgersClassicos' },
            { name: "Duplo Cheddar", description: "Dois hambúrgueres, queijo cheddar, alface, tomate, cebola roxa, picles, cream cheddar.", price: 23.00, category: 'hamburgersClassicos' },
            { name: "Clássico Salame Chesse", description: "Carne grelhada, queijo cheddar, alface, tomate, cebola roxa, picles, salame, cream chesse.", price: 30.00, category: 'hamburgersClassicos' }
        ],
        hamburgersPremiums: [
            { name: "BBQ Éden", description: "Carne grelhada 180g, queijo cheddar, alface, tomate, cebola roxa, picles.", price: 25.00, category: 'hamburgersPremiums' },
            { name: "BBQ Gideão", description: "Carne grelhada, molho barbecue, queijo cheddar, bacon, alface, tomate, cebola roxa, picles.", price: 29.90, category: 'hamburgersPremiums' },
            { name: "BBQ Elias", description: "Carne grelhada, queijo cheddar, calabresa, alface, tomate, cebola roxa, picles.", price: 28.00, category: 'hamburgersPremiums' },
            { name: "BBQ Sansão", description: "Carne grelhada, queijo cheddar, alface, tomate, cebola roxa, picles, salame, cream chesse.", price: 32.50, category: 'hamburgersPremiums' },
            { name: "BBQ Rei dos Reis", description: "Carne grelhada, barbecue defumado, queijo cheddar, bacon, calabresa, alface, tomate, cebola roxa, picles, cream chesse.", price: 38.90, category: 'hamburgersPremiums' },
            { name: "BBQ Apocalíptico", description: "2 carnes grelhadas, barbecue defumado, maionese defumada, queijo cheddar, alface, tomate, cebola roxa, picles, cream cheddar, cream chesse, ovo, filé de frango grelhado.", price: 42.90, category: 'hamburgersPremiums' }
        ],
        bebidas: [
            { name: "Refrigerante 1L", description: "Coca-Cola, São Gerardo, Fanta, Guaraná.", price: 12.00, category: 'bebidas' },
            { name: "Refrigerante Lata", description: "Coca-Cola, São Gerardo, Fanta, Guaraná.", price: 6.00, category: 'bebidas' },
            { name: "Suco Natural 1L", description: "Manga, Maracujá, Goiaba.", price: 14.00, category: 'bebidas' },
            { name: "Suco Natural 1L", description: "Morango, Cajá, Acerola, Abacaxi, Graviola.", price: 22.00, category: 'bebidas' },
            { name: "Suco Natural (copo)", description: "Manga, Maracujá,  Goiaba.", price: 8.50, category: 'bebidas' },
            { name: "Suco Natural (copo)", description: "Morango, Cajá, Acerola, Abacaxi, Graviola.", price: 10.00, category: 'bebidas' },
            { name: "Milkshake", description: "Chocolate, Morango", price: 18.00, category: 'bebidas' }
        ]
    };

    let menuData = {
        hamburgersClassicos: [],
        hamburgersPremiums: [],
        bebidas: []
    };

    // --- VARIÁVEIS GLOBAIS ---
    let cart = [];
    let openingHour = 8, closingHour = 3;
    let currentOrderType = 'Delivery';
    let paymentMethodSelected = false;

    // --- LÓGICA DE CARREGAMENTO DE DADOS DO SUPABASE ---
    async function loadData() {
        try {
            // Carregar Menu
            const { data: menu, error: menuError } = await supabaseClient
                .from('menu_items')
                .select('*');

            if (menuError) throw menuError;

            if (menu && menu.length > 0) {
                // Se tem dados no banco, usa eles
                menuData = {
                    hamburgersClassicos: menu.filter(i => i.category === 'hamburgersClassicos').sort((a, b) => a.name.localeCompare(b.name)),
                    hamburgersPremiums: menu.filter(i => i.category === 'hamburgersPremiums').sort((a, b) => a.name.localeCompare(b.name)),
                    bebidas: menu.filter(i => i.category === 'bebidas').sort((a, b) => a.name.localeCompare(b.name))
                };
            } else {
                // Se o banco está vazio, usa o padrão e TENTA popular o banco (Auto-Seeding)
                console.log('Banco de dados vazio. Usando dados padrão e tentando popular...');
                menuData = JSON.parse(JSON.stringify(defaultMenuData)); // Deep copy

                // Preparar dados para inserção (flat array)
                const itemsToInsert = [
                    ...defaultMenuData.hamburgersClassicos,
                    ...defaultMenuData.hamburgersPremiums,
                    ...defaultMenuData.bebidas
                ];

                // Inserir no Supabase em background
                const { error: insertError } = await supabaseClient.from('menu_items').insert(itemsToInsert);
                if (insertError) console.error('Erro ao popular banco inicial:', insertError);
                else console.log('Banco populado com dados iniciais com sucesso!');
            }

            renderMenu('hamburgersClassicos');

            // Carregar Horários
            const { data: hours, error: hoursError } = await supabaseClient
                .from('operating_hours')
                .select('*')
                .single();

            if (hoursError && hoursError.code !== 'PGRST116') throw hoursError;

            if (hours) {
                openingHour = hours.open_hour;
                closingHour = hours.close_hour;
            }

            updateHeaderHoursDisplay();
            updateRestaurantStatus();

            // Atualizar o carrinho quando o modal abre para garantir que o cálculo esteja correto
            setTimeout(() => {
                const paymentMethod = document.getElementById('payment').value;
                const isCardPayment = paymentMethod === 'Cartão de Crédito' || paymentMethod === 'Cartão de Débito';
                paymentMethodSelected = isCardPayment;
                updateCart();
            }, 100);

        } catch (error) {
            console.error('Erro ao carregar dados do Supabase:', error);
            showToast('Erro ao conectar com o servidor.');
            // Fallback visual se der erro fatal
            if (Object.values(menuData).every(arr => arr.length === 0)) {
                menuData = JSON.parse(JSON.stringify(defaultMenuData));
                renderMenu('hamburgersClassicos');
            }
        }
    }

    // --- LÓGICA DO TEMA ---
    const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
    const themeLabel = document.getElementById('theme-label');
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
        if (currentTheme === 'light') {
            toggleSwitch.checked = true;
            themeLabel.textContent = 'Modo Claro';
        } else {
            themeLabel.textContent = 'Modo Escuro';
        }
    }
    function switchTheme(e) {
        const theme = e.target.checked ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        // Atualiza o texto do label
        themeLabel.textContent = theme === 'light' ? 'Modo Claro' : 'Modo Escuro';
    }
    toggleSwitch.addEventListener('change', switchTheme, false);

    // --- LÓGICA DE HORÁRIO DE FUNCIONAMENTO ---
    function verificarHorario() {
        const horarioElemento = document.getElementById("header-hours");
        const agora = new Date();
        const horaAtual = agora.getHours() + agora.getMinutes() / 60;
        let aberto;
        if (closingHour < openingHour) {
            aberto = horaAtual >= openingHour || horaAtual < closingHour;
        } else {
            aberto = horaAtual >= openingHour && horaAtual < closingHour;
        }
        if (horarioElemento) horarioElemento.style.color = aberto ? "green" : "red";
    }
    verificarHorario();
    setInterval(verificarHorario, 60000);

    const closedModal = document.getElementById('closed-modal');
    const headerHours = document.getElementById('header-hours');

    function updateHeaderHoursDisplay() {
        if (headerHours) headerHours.textContent = `${String(openingHour).padStart(2, '0')}:00 - ${String(closingHour).padStart(2, '0')}:00`;
        const modalTime = document.querySelector('#closed-modal .opening-time');
        if (modalTime) modalTime.textContent = `${String(openingHour).padStart(2, '0')}:00`;
    }

    function isRestaurantOpen() {
        const now = new Date();
        const currentHour = now.getHours();
        if (closingHour < openingHour) {
            return currentHour >= openingHour || currentHour < closingHour;
        } else {
            return currentHour >= openingHour && currentHour < closingHour;
        }
    }

    function updateRestaurantStatus() {
        const isOpen = isRestaurantOpen();
        if (closedModal) closedModal.style.display = isOpen ? 'none' : 'block';
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => btn.disabled = !isOpen);
    }
    setInterval(updateRestaurantStatus, 60000);

    // --- LÓGICA ADMINISTRATIVA (SUPABASE) ---
    const adminModal = document.getElementById('admin-modal');
    const adminPanel = document.getElementById('admin-panel');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    const adminHoursForm = document.getElementById('admin-hours-form');
    const adminMenuEditor = document.getElementById('admin-menu-editor');

    document.getElementById('current-year').addEventListener('click', () => {
        // Fechar modal de fechado se estiver aberto
        const closedModal = document.getElementById('closed-modal');
        if (closedModal) {
            closedModal.style.display = 'none';
        }
        adminModal.style.display = 'block';
    });

    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!loginRateLimiter.canAttempt('admin')) {
            alert('Muitas tentativas incorretas. Tente novamente em 1 minuto.');
            return;
        }
        const password = document.getElementById('admin-password').value;

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: ADMIN_EMAIL,
                password: password,
            });
            if (error) throw error;

            loginRateLimiter.reset('admin');
            adminModal.style.display = 'none';
            adminPanel.style.display = 'block';
            populateAdminEditor();
            document.getElementById('admin-open-hour').value = openingHour;
            document.getElementById('admin-close-hour').value = closingHour;
            updateRestaurantStatus();
            showToast('Login realizado com sucesso!');
        } catch (error) {
            console.error('Erro no login:', error);
            alert('Senha incorreta ou erro no login.');
        }
    });

    adminLogoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        adminPanel.style.display = 'none';
        adminModal.style.display = 'none';
        document.getElementById('admin-password').value = '';
        showToast('Logout realizado.');
    });

    adminHoursForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const openInput = document.getElementById('admin-open-hour');
            const closeInput = document.getElementById('admin-close-hour');
            const open = parseInt(openInput.value);
            const close = parseInt(closeInput.value);

            if (isNaN(open) || isNaN(close) || open < 0 || open > 23 || close < 0 || close > 23) {
                alert('Por favor, insira horários válidos entre 0 e 23.');
                return;
            }

            const { error } = await supabaseClient
                .from('operating_hours')
                .upsert({ id: 1, open_hour: open, close_hour: close });

            if (error) throw error;

            openingHour = open;
            closingHour = close;
            updateHeaderHoursDisplay();
            updateRestaurantStatus();
            showToast('Horário de funcionamento atualizado!');
        } catch (error) {
            console.error('Erro ao salvar horários:', error);
            alert('Erro ao salvar horários.');
        }
    });

    function populateAdminEditor() {
        adminMenuEditor.innerHTML = '';
        for (const category in menuData) {
            const section = document.createElement('div');
            section.classList.add('admin-section');
            section.innerHTML = `<h3>${category.charAt(0).toUpperCase() + category.slice(1)}</h3>`;

            menuData[category].forEach((item, index) => {
                const form = document.createElement('div');
                form.classList.add('admin-item-form');
                const itemId = item.id || '';
                form.innerHTML = `
                        <input type="text" value="${item.name}" data-category="${category}" data-index="${index}" data-field="name" placeholder="Nome">
                        <input type="text" value="${item.description}" data-category="${category}" data-index="${index}" data-field="description" placeholder="Descrição">
                        <input type="number" value="${item.price}" data-category="${category}" data-index="${index}" data-field="price" step="0.01" placeholder="Preço">
                        <button class="btn-save" data-category="${category}" data-id="${itemId}">Salvar</button>
                        <button class="btn-delete" data-category="${category}" data-id="${itemId}">Excluir</button>
                    `;
                section.appendChild(form);
            });
            const addBtn = document.createElement('button');
            addBtn.classList.add('btn-add');
            addBtn.textContent = 'Adicionar Novo Item';
            addBtn.dataset.category = category;
            section.appendChild(addBtn);
            adminMenuEditor.appendChild(section);
        }
    }

    adminMenuEditor.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-save')) {
            try {
                const category = e.target.dataset.category;
                const id = e.target.dataset.id;
                const itemForm = e.target.parentElement;

                const nameInput = itemForm.querySelector('[data-field="name"]');
                const descInput = itemForm.querySelector('[data-field="description"]');
                const priceInput = itemForm.querySelector('[data-field="price"]');

                const name = sanitizeInput(nameInput.value);
                const description = sanitizeInput(descInput.value);
                const price = parseFloat(priceInput.value);

                if (!name || !description || isNaN(price)) {
                    alert('Preencha todos os campos corretamente.');
                    return;
                }

                if (id) {
                    const { error } = await supabaseClient
                        .from('menu_items')
                        .update({ name, description, price })
                        .eq('id', id);
                    if (error) throw error;
                    showToast('Item atualizado!');
                } else {
                    alert('Erro: ID do item não encontrado.');
                }
                await loadData();
                populateAdminEditor();
            } catch (error) {
                console.error('Erro ao salvar item:', error);
                alert('Erro ao salvar item.');
            }
        }
        if (e.target.classList.contains('btn-delete')) {
            if (confirm('Tem certeza que deseja excluir este item?')) {
                try {
                    const id = e.target.dataset.id;
                    if (!id) return;
                    const { error } = await supabaseClient.from('menu_items').delete().eq('id', id);
                    if (error) throw error;
                    showToast('Item excluído!');
                    await loadData();
                    populateAdminEditor();
                } catch (error) {
                    console.error('Erro ao excluir item:', error);
                    alert('Erro ao excluir item.');
                }
            }
        }
        if (e.target.classList.contains('btn-add')) {
            try {
                const category = e.target.dataset.category;
                const { error } = await supabaseClient.from('menu_items').insert([{
                    category: category,
                    name: 'Novo Item',
                    description: 'Descrição',
                    price: 0.00
                }]);
                if (error) throw error;
                showToast('Novo item criado! Edite os detalhes.');
                await loadData();
                populateAdminEditor();
            } catch (error) {
                console.error('Erro ao adicionar item:', error);
                alert('Erro ao adicionar item.');
            }
        }
    });

    // --- LÓGICA DO CARRINHO E MENU ---
    const menuContent = document.getElementById('menu-content');
    const cartItems = document.getElementById('cart-items');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartServiceFee = document.getElementById('cart-service-fee');
    const cartTotal = document.getElementById('cart-total');
    const serviceFeeDisplay = document.getElementById('service-fee-display');
    const emptyCartMessage = document.getElementById('empty-cart');
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutModal = document.getElementById('checkout-modal');
    const closeBtn = document.querySelector('.close-btn');
    const checkoutForm = document.getElementById('checkout-form');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const toast = document.getElementById('toast');
    const floatingCartBtn = document.getElementById('floating-cart-btn');
    const cartBadge = document.getElementById('cart-badge');
    const cartContainer = document.getElementById('cart-container');
    const closeCartBtn = document.querySelector('.close-cart-btn');
    const addressGroup = document.getElementById('address-group');
    const mesaGroup = document.getElementById('mesa-group');
    const addressInput = document.getElementById('address');
    const mesaSelect = document.getElementById('mesa');
    const paymentSelect = document.getElementById('payment');
    const paymentFeeNotice = document.getElementById('payment-fee-notice');

    const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const updateCartBadge = () => {
        const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartBadge) {
            cartBadge.textContent = itemCount > 0 ? itemCount : '';
            cartBadge.style.display = itemCount > 0 ? 'flex' : 'none';
        }
    };

    const calculateTotals = () => {
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const paymentMethod = document.getElementById('payment').value;
        const isCardPayment = paymentMethod === 'Cartão de Crédito' || paymentMethod === 'Cartão de Débito';
        const serviceFee = isCardPayment ? subtotal * 0.05 : 0;
        const total = subtotal + serviceFee;
        return { subtotal, serviceFee, total };
    };

    const renderMenu = (category) => {
        if (!menuContent) return;
        menuContent.innerHTML = '';
        const products = menuData[category];
        if (products) {
            products.forEach(product => {
                const productCard = document.createElement('article');
                productCard.classList.add('product-card');
                productCard.innerHTML = `
                        <div class="product-card-content">
                            <h3>${product.name}</h3>
                            <p>${product.description}</p>
                            <div class="price">${formatCurrency(product.price)}</div>
                            <button class="add-to-cart-btn" data-name="${product.name}" data-price="${product.price}">Adicionar ao Carrinho</button>
                        </div>
                    `;
                menuContent.appendChild(productCard);
            });
        }
        updateRestaurantStatus();
    };

    const updateCart = () => {
        if (!cartItems) return;
        cartItems.innerHTML = '';
        if (cart.length === 0) {
            if (emptyCartMessage) emptyCartMessage.style.display = 'block';
            cartItems.style.display = 'none';
        } else {
            if (emptyCartMessage) emptyCartMessage.style.display = 'none';
            cartItems.style.display = 'block';
            cart.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                        <div class="item-details">
                            <span class="item-name">${item.name}</span>
                            <span class="item-price">${formatCurrency(item.price)}</span>
                        </div>
                        <div class="quantity-controls">
                            <button class="quantity-btn decrease" data-name="${item.name}">-</button>
                            <span class="item-quantity">${item.quantity}</span>
                            <button class="quantity-btn increase" data-name="${item.name}">+</button>
                        </div>
                    `;
                cartItems.appendChild(li);
            });
        }
        const { subtotal, serviceFee, total } = calculateTotals();
        if (cartSubtotal) cartSubtotal.textContent = formatCurrency(subtotal);
        if (serviceFee > 0) {
            if (serviceFeeDisplay) serviceFeeDisplay.style.display = 'block';
            if (cartServiceFee) cartServiceFee.textContent = formatCurrency(serviceFee);
        } else {
            if (serviceFeeDisplay) serviceFeeDisplay.style.display = 'none';
        }
        if (cartTotal) cartTotal.textContent = formatCurrency(total);
        updateCartBadge();
    };

    const addToCart = (name, price) => {
        if (!isRestaurantOpen()) {
            showToast('Restaurante fechado no momento.');
            return;
        }
        const existingItem = cart.find(item => item.name === name);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ name, price, quantity: 1 });
        }
        updateCart();
        showToast(`"${name}" adicionado!`);
    };

    const changeItemQuantity = (name, change) => {
        const item = cart.find(item => item.name === name);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                removeFromCart(name);
            } else {
                updateCart();
            }
        }
    };

    const removeFromCart = (name) => {
        cart = cart.filter(item => item.name !== name);
        updateCart();
    };

    const sendOrderToWhatsApp = (customerDetails) => {
        const orderTypeElement = document.querySelector('input[name="order-type"]:checked');
        const orderType = orderTypeElement ? orderTypeElement.value : 'Não informado';
        let orderMessage = `*NOVO PEDIDO - GOSPEL BURGER*%0A%0A`;
        orderMessage += `*Dados do Cliente:*%0A`;
        orderMessage += `Nome: ${customerDetails.name}%0A`;
        if (orderType === 'Mesa') {
            orderMessage += `Mesa: ${customerDetails.mesa}%0A`;
        } else {
            orderMessage += `Endereço: ${customerDetails.address}%0A`;
        }
        orderMessage += `Pagamento: ${customerDetails.payment}%0A`;
        if (customerDetails.notes) orderMessage += `Observações: ${customerDetails.notes}%0A`;
        orderMessage += `%0A*Tipo de Pedido:* ${orderType}%0A`;
        orderMessage += `%0A*Itens do Pedido:*%0A`;
        let orderTotal = 0;
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            orderMessage += `- ${item.name} (x${item.quantity}): ${formatCurrency(itemTotal)}%0A`;
            orderTotal += itemTotal;
        });
        const isCardPayment = customerDetails.payment === 'Cartão de Crédito' || customerDetails.payment === 'Cartão de Débito';
        if (isCardPayment) {
            const serviceFee = orderTotal * 0.05;
            orderMessage += `Taxa do cartão (5%): ${formatCurrency(serviceFee)}%0A`;
            orderTotal += serviceFee;
        }
        orderMessage += `%0A*Total do Pedido: ${formatCurrency(orderTotal)}*`;
        window.open(`https://wa.me/5585992075321?text=${orderMessage}`, '_blank');
    };

    // --- EVENT LISTENERS ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            renderMenu(button.dataset.category);
        });
    });

    menuContent.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-cart-btn')) {
            const name = e.target.dataset.name;
            const price = parseFloat(e.target.dataset.price);
            addToCart(name, price);
        }
    });

    cartItems.addEventListener('click', (e) => {
        if (e.target.classList.contains('increase') || e.target.classList.contains('decrease')) {
            const name = e.target.dataset.name;
            const change = e.target.classList.contains('increase') ? 1 : -1;
            changeItemQuantity(name, change);
        }
    });

    document.querySelectorAll('input[name="order-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentOrderType = e.target.value;
            if (currentOrderType === 'Mesa') {
                addressGroup.style.display = 'none';
                addressInput.required = false;
                mesaGroup.style.display = 'block';
                mesaSelect.required = true;
            } else {
                addressGroup.style.display = 'block';
                addressInput.required = true;
                mesaGroup.style.display = 'none';
                mesaSelect.required = false;
            }
        });
    });

    paymentSelect.addEventListener('change', (e) => {
        const isCardPayment = e.target.value === 'Cartão de Crédito' || e.target.value === 'Cartão de Débito';
        if (isCardPayment) {
            paymentFeeNotice.style.display = 'block';
            paymentMethodSelected = true;
        } else {
            paymentFeeNotice.style.display = 'none';
            paymentMethodSelected = false;
        }
        updateCart();
    });

    closeBtn.addEventListener('click', () => {
        checkoutModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === checkoutModal) checkoutModal.style.display = 'none';
        if (e.target === adminModal) adminModal.style.display = 'none';
    });

    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const customerDetails = {
            name: document.getElementById('name').value,
            address: document.getElementById('address').value,
            mesa: document.getElementById('mesa').value,
            payment: document.getElementById('payment').value,
            notes: document.getElementById('notes').value
        };
        sendOrderToWhatsApp(customerDetails);
        cart = [];
        updateCart();
        checkoutModal.style.display = 'none';
        checkoutForm.reset();
        addressGroup.style.display = 'block';
        addressInput.required = true;
        mesaGroup.style.display = 'none';
        mesaSelect.required = false;
        paymentFeeNotice.style.display = 'none';
        currentOrderType = 'Delivery';
        paymentMethodSelected = false;
        showToast('Pedido enviado com sucesso!');
    });

    floatingCartBtn.addEventListener('click', () => {
        cartContainer.classList.toggle('open');
    });

    closeCartBtn.addEventListener('click', () => {
        cartContainer.classList.remove('open');
    });

    // --- INICIALIZAÇÃO ---
    document.getElementById('current-year').textContent = new Date().getFullYear();
    loadData();
    updateCart();

    checkoutBtn.addEventListener('click', () => {
        if (cart.length > 0) {
            checkoutModal.style.display = 'block';
            setTimeout(() => {
                const paymentMethod = document.getElementById('payment').value;
                const isCardPayment = paymentMethod === 'Cartão de Crédito' || paymentMethod === 'Cartão de Débito';
                paymentMethodSelected = isCardPayment;
                updateCart();
            }, 100);
        } else {
            showToast('Seu carrinho está vazio!');
        }
    });
});
