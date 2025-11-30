(function() {
  // Prevenir múltiplas cargas
  if (window.__PUBLIC_CHAT_WIDGET_LOADED__) return;
  window.__PUBLIC_CHAT_WIDGET_LOADED__ = true;

  // Constantes
  const IDENTITY_STORAGE_KEY = "public_chat_identity";
  const IDENTITY_EXPIRES_DAYS = 30;

  // Detectar configuração via data-attributes
  const scriptTag = document.currentScript;
  const customColor = scriptTag?.getAttribute('data-color') || '#2563EB';
  const position = scriptTag?.getAttribute('data-position') || 'right';
  const greeting = scriptTag?.getAttribute('data-greeting') || 'Posso ajudar?';
  const defaultDept = scriptTag?.getAttribute('data-dept') || '';
  const customLogo = scriptTag?.getAttribute('data-logo') || '';
  const showWhatsApp = scriptTag?.getAttribute('data-show-whatsapp') !== 'false';
  const showTicket = scriptTag?.getAttribute('data-show-ticket') !== 'false';

  // Verificar identidade armazenada
  function getStoredIdentity() {
    const stored = localStorage.getItem(IDENTITY_STORAGE_KEY);
    if (!stored) return null;

    try {
      const identity = JSON.parse(stored);
      const expiresAt = new Date(identity.expires_at);
      const now = new Date();

      if (expiresAt > now) {
        return identity;
      } else {
        localStorage.removeItem(IDENTITY_STORAGE_KEY);
        return null;
      }
    } catch (error) {
      console.error("Erro ao ler identidade:", error);
      localStorage.removeItem(IDENTITY_STORAGE_KEY);
      return null;
    }
  }

  // Salvar identidade
  function saveIdentity(email, firstName) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + IDENTITY_EXPIRES_DAYS);

    const identity = {
      email,
      first_name: firstName,
      last_name: "",
      identified_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity));
    return identity;
  }

  // Criar container do widget
  const container = document.createElement('div');
  container.id = 'public-chat-launcher-widget';
  const positionStyle = position === 'left' ? 'left: 24px;' : 'right: 24px;';
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    ${positionStyle}
    z-index: 9999;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  document.body.appendChild(container);

  // Injetar CSS
  const style = document.createElement('style');
  style.textContent = `
    .pcw-button {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: ${customColor};
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }
    
    .pcw-button:hover {
      transform: scale(1.1);
    }
    
    .pcw-menu {
      position: absolute;
      bottom: 70px;
      ${position === 'left' ? 'left: 0;' : 'right: 0;'}
      width: 320px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      border: 2px solid hsl(240 5% 84%);
      padding: 16px;
      animation: slideUp 0.3s;
      display: none;
    }
    
    .pcw-menu.open {
      display: block;
    }
    
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .pcw-menu-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid hsl(240 5% 90%);
    }
    
    .pcw-logo {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .pcw-menu-title {
      font-size: 16px;
      font-weight: 600;
      flex: 1;
    }
    
    .pcw-menu-subtitle {
      font-size: 12px;
      opacity: 0.7;
    }
    
    .pcw-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      opacity: 0.6;
    }
    
    .pcw-close:hover {
      opacity: 1;
    }
    
    .pcw-identity-form {
      margin-bottom: 16px;
    }
    
    .pcw-form-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }
    
    .pcw-input {
      width: 100%;
      padding: 10px;
      border: 1px solid hsl(240 5% 84%);
      border-radius: 6px;
      margin-bottom: 8px;
      font-size: 14px;
      box-sizing: border-box;
    }
    
    .pcw-input:focus {
      outline: none;
      border-color: ${customColor};
    }
    
    .pcw-submit-btn {
      width: 100%;
      background: ${customColor};
      color: white;
      border: none;
      padding: 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: opacity 0.2s;
    }
    
    .pcw-submit-btn:hover {
      opacity: 0.9;
    }
    
    .pcw-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid hsl(240 5% 84%);
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
      background: white;
      width: 100%;
      text-align: left;
    }
    
    .pcw-option:hover {
      border-color: ${customColor};
      background: hsl(240 5% 96%);
    }
    
    .pcw-option-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .pcw-option-content {
      flex: 1;
    }
    
    .pcw-option-title {
      font-weight: 600;
      margin-bottom: 2px;
    }
    
    .pcw-option-desc {
      font-size: 12px;
      opacity: 0.7;
    }
    
    .pcw-greeting {
      position: absolute;
      bottom: 70px;
      ${position === 'left' ? 'left: 0;' : 'right: 0;'}
      background: white;
      padding: 8px 12px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      font-size: 14px;
      white-space: nowrap;
      animation: fadeIn 0.3s;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Criar HTML do widget
  const logoHtml = customLogo 
    ? `<img src="${customLogo}" alt="Logo" class="pcw-logo" />`
    : `<div class="pcw-logo" style="background: ${customColor}20; display: flex; align-items: center; justify-content: center;">
         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${customColor}" stroke-width="2">
           <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
         </svg>
       </div>`;

  container.innerHTML = `
    <div class="pcw-greeting" id="pcw-greeting">${greeting}</div>
    <div class="pcw-menu" id="pcw-menu">
      <div class="pcw-menu-header">
        ${logoHtml}
        <div style="flex: 1;">
          <div class="pcw-menu-title">Como podemos ajudar?</div>
          <div class="pcw-menu-subtitle">Escolha um canal</div>
        </div>
        <button class="pcw-close" id="pcw-close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="pcw-identity-form" id="pcw-identity-form" style="display: none;">
        <div class="pcw-form-title">Identifique-se para começar</div>
        <input type="email" id="pcw-email-input" class="pcw-input" placeholder="Seu email" required />
        <input type="text" id="pcw-name-input" class="pcw-input" placeholder="Seu nome" required />
        <button id="pcw-submit-identity" class="pcw-submit-btn">Continuar</button>
      </div>
      <div id="pcw-options"></div>
    </div>
    <button class="pcw-button" id="pcw-toggle">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
  `;

  // Event listeners
  const toggleBtn = document.getElementById('pcw-toggle');
  const closeBtn = document.getElementById('pcw-close');
  const menu = document.getElementById('pcw-menu');
  const greetingEl = document.getElementById('pcw-greeting');
  const identityForm = document.getElementById('pcw-identity-form');
  const emailInput = document.getElementById('pcw-email-input');
  const nameInput = document.getElementById('pcw-name-input');
  const submitIdentityBtn = document.getElementById('pcw-submit-identity');
  const optionsContainer = document.getElementById('pcw-options');

  // Toggle menu
  toggleBtn.addEventListener('click', () => {
    const isOpen = menu.classList.contains('open');
    const storedIdentity = getStoredIdentity();
    
    if (!isOpen) {
      // Abrindo menu
      menu.classList.add('open');
      greetingEl.style.display = 'none';
      
      if (!storedIdentity) {
        // Mostrar formulário de identificação
        identityForm.style.display = 'block';
        optionsContainer.style.display = 'none';
      } else {
        // Já identificado, mostrar opções de chat
        identityForm.style.display = 'none';
        optionsContainer.style.display = 'block';
      }
    } else {
      // Fechando menu
      menu.classList.remove('open');
      greetingEl.style.display = 'block';
    }
  });

  // Submit identity
  submitIdentityBtn.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const name = nameInput.value.trim();

    if (!email || !name) {
      alert('Por favor, preencha email e nome');
      return;
    }

    if (!email.includes('@')) {
      alert('Por favor, digite um email válido');
      return;
    }

    // Salvar identidade
    saveIdentity(email, name);

    // Esconder formulário e mostrar opções
    identityForm.style.display = 'none';
    optionsContainer.style.display = 'block';

    // Limpar inputs
    emailInput.value = '';
    nameInput.value = '';
  });

  // Close menu
  closeBtn.addEventListener('click', () => {
    menu.classList.remove('open');
    greetingEl.style.display = 'block';
  });

  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      menu.classList.remove('open');
      greetingEl.style.display = 'block';
    }
  });

  // Fetch configuração do departamento para pegar WhatsApp
  fetch(window.location.origin + '/api/departments?dept=' + defaultDept)
    .catch(() => null)
    .then(res => res?.json())
    .then(config => {
      const whatsapp = config?.whatsapp_number;
      const deptParam = defaultDept ? `?dept=${defaultDept}` : '';
      
      let optionsHtml = '';

      // WhatsApp option (conditional)
      if (showWhatsApp && whatsapp) {
        optionsHtml += `
          <button class="pcw-option" onclick="window.open('https://wa.me/${whatsapp}?text=Olá, preciso de ajuda', '_blank')">
            <div class="pcw-option-icon" style="background: #dcfce7;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </div>
            <div class="pcw-option-content">
              <div class="pcw-option-title">WhatsApp</div>
              <div class="pcw-option-desc">Resposta rápida via WhatsApp</div>
            </div>
          </button>
        `;
      }

      // Live Chat option (always shown)
      optionsHtml += `
        <button class="pcw-option" onclick="window.location.href='${window.location.origin}/public-chat${deptParam}'">
          <div class="pcw-option-icon" style="background: ${customColor}20;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${customColor}" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div class="pcw-option-content">
            <div class="pcw-option-title">Chat ao Vivo</div>
            <div class="pcw-option-desc">Converse em tempo real</div>
          </div>
        </button>
      `;

      // Ticket option (conditional)
      if (showTicket) {
        optionsHtml += `
          <button class="pcw-option" onclick="window.location.href='${window.location.origin}/open-ticket${deptParam}'">
            <div class="pcw-option-icon" style="background: #fef3c7;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
              </svg>
            </div>
            <div class="pcw-option-content">
              <div class="pcw-option-title">Abrir Ticket</div>
              <div class="pcw-option-desc">Envie sua solicitação</div>
            </div>
          </button>
        `;
      }
      
      optionsContainer.innerHTML = optionsHtml;
    });
})();
