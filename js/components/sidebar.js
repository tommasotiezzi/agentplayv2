/* ===================================
   SIDEBAR COMPONENT - REUSABLE
   =================================== */

class Sidebar {
    constructor() {
        this.navItems = [
            {
                href: 'dashboard.html',
                icon: '📊',
                label: 'Dashboard',
                id: 'dashboard'
            },
            {
                href: 'players.html',
                icon: '👥',
                label: 'Players',
                id: 'players'
            },
            {
                href: 'deals.html',
                icon: '🤝',
                label: 'Deals',
                id: 'deals',
                disabled: true
            },
            {
                href: 'contracts.html',
                icon: '📝',
                label: 'Contracts',
                id: 'contracts',
                disabled: true
            },
            {
                href: 'payments.html',
                icon: '💰',
                label: 'Payments',
                id: 'payments',
                disabled: true
            },
            {
                href: 'calendar.html',
                icon: '📅',
                label: 'Calendar',
                id: 'calendar',
                disabled: true
            },
            {
                href: 'contacts.html',
                icon: '📞',
                label: 'Contacts',
                id: 'contacts',
                disabled: true
            }
        ];
    }

    render(activePageId) {
        console.log('🎨 Sidebar render() called for page:', activePageId);
        
        const navItemsHTML = this.navItems.map(item => {
            const isActive = item.id === activePageId;
            const isDisabled = item.disabled;
            const classes = ['nav-item'];
            
            if (isActive) classes.push('active');
            if (isDisabled) classes.push('disabled');

            return `
                <a href="${isDisabled ? '#' : item.href}" class="${classes.join(' ')}">
                    <span class="nav-icon">${item.icon}</span>
                    <span class="nav-label">${item.label}</span>
                </a>
            `;
        }).join('');

        const sidebarHTML = `
            <aside class="sidebar">
                <nav class="sidebar-nav">
                    ${navItemsHTML}
                </nav>
            </aside>
        `;

        console.log('📝 Sidebar HTML generated');

        // Wrap app-container if not already wrapped
        const appContainer = document.querySelector('.app-container');
        
        if (appContainer && !appContainer.parentElement.classList.contains('page-wrapper')) {
            console.log('✅ Wrapping app-container with page-wrapper');
            const wrapper = document.createElement('div');
            wrapper.className = 'page-wrapper';
            appContainer.parentNode.insertBefore(wrapper, appContainer);
            wrapper.appendChild(appContainer);
            
            // Insert sidebar at start of wrapper
            wrapper.insertAdjacentHTML('afterbegin', sidebarHTML);
        } else {
            console.warn('⚠️ Fallback: inserting after navbar');
            const navbar = document.querySelector('.navbar');
            if (navbar) {
                navbar.insertAdjacentHTML('afterend', sidebarHTML);
            }
        }
        
        console.log('✅ Sidebar inserted');
    }
}

// Helper function to initialize sidebar on any page - GLOBAL
window.initSidebar = function(activePageId) {
    console.log('🎨 initSidebar called with:', activePageId);
    const sidebar = new Sidebar();
    sidebar.render(activePageId);
    console.log('✅ Sidebar render complete');
    
    // Verify it's in DOM
    const sidebarElement = document.querySelector('.sidebar');
    if (sidebarElement) {
        console.log('✅ Sidebar found in DOM');
    } else {
        console.error('❌ Sidebar NOT in DOM after render!');
    }
}

console.log('✅ Sidebar component loaded, window.initSidebar available');