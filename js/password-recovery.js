// --- LÓGICA DE RECUPERAÇÃO DE SENHA POR WHATSAPP ---

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('🔐 Inicializando recuperação de senha...');

        // Verificar dependências
        if (typeof RateLimiter === 'undefined') {
            console.error('❌ RateLimiter não encontrado');
            return;
        }

        if (typeof supabaseClient === 'undefined') {
            console.error('❌ supabaseClient não encontrado');
            return;
        }

        console.log('✅ Dependências carregadas');

        // Variáveis
        let generatedCode = '';
        let recoveryPhone = '';
        const RECOVERY_RATE_LIMITER = new RateLimiter(3, 300000);

        // Elementos
        const forgotLink = document.getElementById('forgot-password-link');
        const adminModal = document.getElementById('admin-modal');
        const adminForm = document.getElementById('admin-login-form');
        const recoveryForm = document.getElementById('forgot-password-whatsapp-form');
        const verifyForm = document.getElementById('verify-code-form');
        const closedModal = document.getElementById('closed-modal');

        console.log('Elementos:', {
            forgotLink: !!forgotLink,
            adminModal: !!adminModal,
            adminForm: !!adminForm,
            recoveryForm: !!recoveryForm,
            verifyForm: !!verifyForm,
            closedModal: !!closedModal
        });

        if (!forgotLink || !adminModal || !adminForm || !recoveryForm || !verifyForm) {
            console.error('❌ Elementos não encontrados');
            return;
        }

        // Função para gerar código
        function generateCode() {
            return Math.floor(100000 + Math.random() * 900000).toString();
        }

        // EVENTO: Clicar em "Esqueceu senha"
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔗 Esqueceu senha clicado');

            // Fechar modal de fechado se estiver aberto
            if (closedModal) {
                closedModal.style.display = 'none';
            }

            // Garantir que modal admin está aberto
            if (adminModal) {
                adminModal.style.display = 'block';
            }

            // Esconder formulário de login
            adminForm.style.display = 'none';

            // Mostrar formulário de recuperação
            recoveryForm.style.display = 'block';
            verifyForm.style.display = 'none';

            console.log('✅ Formulário de recuperação exibido');
        });

        // EVENTO: Voltar ao login
        const backLink = document.getElementById('back-to-login-whatsapp');
        if (backLink) {
            backLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                recoveryForm.style.display = 'none';
                verifyForm.style.display = 'none';
                adminForm.style.display = 'block';
            });
        }

        // EVENTO: Enviar código
        recoveryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!RECOVERY_RATE_LIMITER.canAttempt('recovery')) {
                showToast('❌ Muitas tentativas. Aguarde 5 minutos.');
                return;
            }

            recoveryPhone = document.getElementById('recovery-phone').value;
            const phoneDigits = recoveryPhone.replace(/\D/g, '');

            if (phoneDigits.length < 10 || phoneDigits.length > 11) {
                showToast('❌ Telefone inválido');
                return;
            }

            generatedCode = generateCode();
            console.log('📱 Código gerado:', generatedCode);

            try {
                // Salvar no Supabase
                await supabaseClient.from('recovery_codes').insert([{
                    phone: phoneDigits,
                    code: generatedCode,
                    expires_at: new Date(Date.now() + 15 * 60000).toISOString()
                }]);

                // Enviar WhatsApp
                const message = `🔒 *Gospel Burger - Código de Recuperação*\n\nSeu código é: *${generatedCode}*\n\nEste código expira em 15 minutos.\n\n_Não compartilhe este código com ninguém._`;
                window.open(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`, '_blank');

                // Mostrar formulário de verificação
                recoveryForm.style.display = 'none';
                verifyForm.style.display = 'block';
                document.getElementById('phone-display').textContent = recoveryPhone;

                showToast('✅ Código enviado!');
            } catch (error) {
                console.error('Erro:', error);
                showToast('❌ Erro ao enviar código');
            }
        });

        // EVENTO: Verificar código
        verifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const code = document.getElementById('verification-code').value;
            const newPassword = document.getElementById('new-password-whatsapp').value;

            if (code.length !== 6 || !/^\d{6}$/.test(code)) {
                showToast('❌ Código inválido');
                return;
            }

            if (newPassword.length < 6) {
                showToast('❌ Senha muito curta');
                return;
            }

            // Use the global recoveryPhone variable
            const phoneDigits = recoveryPhone.replace(/\D/g, '');

            try {
                // Verificar código
                const { data, error } = await supabaseClient
                    .from('recovery_codes')
                    .select('*')
                    .eq('phone', phoneDigits)
                    .eq('code', code)
                    .gt('expires_at', new Date().toISOString())
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (error || !data) {
                    showToast('❌ Código inválido ou expirado');
                    return;
                }

                // Tentar atualizar senha
                try {
                    const { error: updateError } = await supabaseClient.auth.updateUser({
                        password: newPassword
                    });

                    if (updateError) throw updateError;

                    showToast('✅ Senha redefinida!');
                } catch (updateError) {
                    console.error('Erro ao atualizar senha:', updateError);
                    // Se falhar (provavelmente por falta de sessão), tentar enviar link por email
                    if (typeof ADMIN_EMAIL !== 'undefined') {
                        showToast('⚠️ Tentando recuperação via e-mail...');
                        const { error: emailError } = await supabaseClient.auth.resetPasswordForEmail(ADMIN_EMAIL, {
                            redirectTo: window.location.href
                        });

                        if (emailError) {
                            showToast('❌ Erro ao enviar e-mail de recuperação.');
                        } else {
                            showToast('📧 Link enviado para o e-mail do admin!');
                        }
                    } else {
                        showToast('❌ Erro ao redefinir senha. Contate o suporte.');
                    }
                    // Mesmo com erro no update, deletamos o código usado para evitar reuso
                }

                // Deletar código
                await supabaseClient.from('recovery_codes').delete().eq('phone', phoneDigits).eq('code', code);

                // Limpar e voltar
                document.getElementById('verification-code').value = '';
                document.getElementById('new-password-whatsapp').value = '';
                document.getElementById('recovery-phone').value = '';

                verifyForm.style.display = 'none';
                adminForm.style.display = 'block';

                RECOVERY_RATE_LIMITER.reset('recovery');
            } catch (error) {
                console.error('Erro:', error);
                showToast('❌ Erro ao processar');
            }
        });

        // EVENTO: Reenviar código
        const resendLink = document.getElementById('resend-code-link');
        if (resendLink) {
            resendLink.addEventListener('click', (e) => {
                e.preventDefault();
                verifyForm.style.display = 'none';
                recoveryForm.style.display = 'block';
                showToast('💡 Digite seu telefone novamente');
            });
        }

        // --- FLUXO DE RECUPERAÇÃO POR EMAIL (OFICIAL) ---
        const resetPasswordForm = document.getElementById('reset-password-form');

        // Ouvinte de Estado de Autenticação
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Auth State Change:', event);
            if (event === 'PASSWORD_RECOVERY') {
                console.log('🔄 Modo de recuperação de senha detectado');

                // Garantir que o modal admin esteja aberto e limpo
                if (closedModal) closedModal.style.display = 'none';
                adminModal.style.display = 'block';

                // Esconder outros forms
                adminForm.style.display = 'none';
                recoveryForm.style.display = 'none';
                verifyForm.style.display = 'none';

                // Mostrar form de reset
                if (resetPasswordForm) {
                    resetPasswordForm.style.display = 'block';
                }
                showToast('👋 Olá! Defina sua nova senha.');
            }
        });

        // Handler do Form de Reset (Email)
        if (resetPasswordForm) {
            resetPasswordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newPassword = document.getElementById('new-password-email').value;

                if (newPassword.length < 6) {
                    showToast('❌ Senha muito curta');
                    return;
                }

                try {
                    const { error } = await supabaseClient.auth.updateUser({
                        password: newPassword
                    });

                    if (error) throw error;

                    showToast('✅ Senha atualizada com sucesso!');

                    // Limpar e voltar ao login
                    document.getElementById('new-password-email').value = '';
                    resetPasswordForm.style.display = 'none';
                    adminForm.style.display = 'block';

                    // Opcional: Fazer logout para forçar login com nova senha ou manter logado
                    // await supabaseClient.auth.signOut(); 

                } catch (error) {
                    console.error('Erro ao atualizar senha:', error);
                    showToast('❌ Erro ao atualizar senha.');
                }
            });
        }

        console.log('✅ Recuperação de senha inicializada');
    }, 500);
});
