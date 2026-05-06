// utils/helpers.js
export function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

export function getDeclension(number, one, two, five) {
    let n = Math.abs(number) % 100;
    if (n > 10 && n < 20) return five;
    n = n % 10;
    if (n === 1) return one;
    if (n > 1 && n < 5) return two;
    return five;
}

export function getPlaceholderImage(text = 'No image') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="#e9ecef"/>
        <text x="50" y="55" text-anchor="middle" fill="#adb5bd" font-size="10" font-family="Arial">${text}</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getStatusText(status) {
    const statusMap = {
        'active': 'Активна',
        'inactive': 'Неактивна',
        'pending': 'Ожидание',
        'expired': 'Просрочена',
        'rejected': 'Отклонена'
    };
    return statusMap[status] || status;
}

export function showConfirmDialog(message, subtitle = '') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'confirm-dialog';
        modal.innerHTML = `
            <div class="confirm-dialog-content">
                <h4>${message}</h4>
                ${subtitle ? `<p>${subtitle}</p>` : ''}
                <div class="confirm-dialog-buttons">
                    <button class="btn btn-secondary confirm-no">Отмена</button>
                    <button class="btn btn-danger confirm-yes">Удалить</button>
                </div>
            </div>
        `;

        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;

        const content = modal.querySelector('.confirm-dialog-content');
        content.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 12px;
            min-width: 300px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        `;

        document.body.appendChild(modal);

        modal.querySelector('.confirm-no').onclick = () => {
            modal.remove();
            resolve(false);
        };

        modal.querySelector('.confirm-yes').onclick = () => {
            modal.remove();
            resolve(true);
        };
    });
}