import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Calculator, ChevronDown, Heart, Laptop, LibraryBig, Menu, Search, ShieldCheck, SlidersHorizontal, Sparkles, X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '/api';
const categories = [
  { name: 'Livros', icon: BookOpen, color: 'lavender' },
  { name: 'Tecnologia', icon: Laptop, color: 'peach' },
  { name: 'Papelaria', icon: LibraryBig, color: 'mint' },
  { name: 'Equipamentos', icon: Calculator, color: 'blue' }
];
const examples = [
  { id: 'demo-1', title: 'Cálculo — James Stewart, 8ª edição', category: 'Livros', dealType: 'SALE', price: 85, condition: 'GOOD', location: 'São Paulo, SP', imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80', owner: { name: 'Marina Costa', course: 'Engenharia Civil' } },
  { id: 'demo-2', title: 'Calculadora científica Casio FX-82', category: 'Equipamentos', dealType: 'RENTAL', price: 12, condition: 'LIKE_NEW', location: 'Campinas, SP', imageUrl: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=800&q=80', owner: { name: 'Lucas Ferreira', course: 'Matemática' } },
  { id: 'demo-3', title: 'Kit de desenho técnico completo', category: 'Papelaria', dealType: 'DONATION', price: null, condition: 'GOOD', location: 'Santos, SP', imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80', owner: { name: 'Ana Clara', course: 'Arquitetura' } },
  { id: 'demo-4', title: 'Introdução à programação com Python', category: 'Livros', dealType: 'TRADE', price: null, condition: 'LIKE_NEW', location: 'São Paulo, SP', imageUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80', owner: { name: 'Rafael Lima', course: 'Sistemas de Informação' } }
];
const dealLabels = { SALE: 'À venda', TRADE: 'Troca', DONATION: 'Doação', RENTAL: 'Aluguel' };
const conditionLabels = { NEW: 'Novo', LIKE_NEW: 'Quase novo', GOOD: 'Bom estado', FAIR: 'Usado' };
const money = (value) => value == null ? null : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function App() {
  const [listings, setListings] = useState(examples);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dealType, setDealType] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('movexa-user')); } catch { return null; } });
  const [token, setToken] = useState(() => localStorage.getItem('movexa-token') || '');
  const [favorites, setFavorites] = useState([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeView, setActiveView] = useState('home');
    const [negotiations, setNegotiations] = useState([]);
  const [selectedNegotiation, setSelectedNegotiation] = useState(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [loadingNegotiations, setLoadingNegotiations] = useState(false);

  const query = useMemo(() => new URLSearchParams(Object.fromEntries(Object.entries({ q: search, category, dealType }).filter(([, value]) => value))), [search, category, dealType]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`${API}/listings?${query}`).then(async (response) => {
      if (!response.ok) throw new Error('Não foi possível carregar os anúncios.');
      return response.json();
    }).then((data) => { if (active && data.items.length) setListings(data.items); else if (active) setListings(search || category || dealType ? [] : examples); })
      .catch(() => { if (active) setListings(examples.filter((item) => (!search || item.title.toLowerCase().includes(search.toLowerCase())) && (!category || item.category === category) && (!dealType || item.dealType === dealType))); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, search, category, dealType]);
    useEffect(() => {
    if (!user || !token) {
      setNegotiations([]);
      setSelectedNegotiation(null);
      return;
    }

    let active = true;
    setLoadingNegotiations(true);

    fetch(`${API}/negotiations/mine`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Não foi possível carregar as negociações.');
        }

        return data;
      })
      .then((data) => {
        if (active) {
          setNegotiations(data.items || []);
        }
      })
      .catch((error) => {
        if (active) {
          setNotice(error.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingNegotiations(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user, token]);

  async function submitAuth(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const mode = modal;
    try {
      const response = await fetch(`${API}/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível entrar.');
      localStorage.setItem('movexa-token', data.token); localStorage.setItem('movexa-user', JSON.stringify(data.user)); setToken(data.token); setUser(data.user); setModal(''); setNotice(`Que bom ter você aqui, ${data.user.name.split(' ')[0]}!`);
    } catch (error) { setNotice(error.message); }
  }

  async function createListing(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const payload = { ...fields, price: fields.price ? Number(fields.price) : null };
    try {
      const response = await fetch(`${API}/listings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível publicar.');
      setNotice('Anúncio enviado! Ele ficará visível após a aprovação da equipe.'); setModal('');
    } catch (error) { setNotice(error.message); }
  }

  function openListing(item) {
    setSelectedListing(item);
    setModal('details');
  }
  async function startNegotiation() {
  if (!user || !token) {
    setModal('login');
    setNotice('Entre na sua conta para iniciar uma negociação.');
    return;
  }

  if (!selectedListing || selectedListing.id.startsWith('demo-')) {
    setNotice('Este é um anúncio demonstrativo. Escolha um anúncio publicado na plataforma.');
    return;
  }

  const content = `Olá! Tenho interesse no material "${selectedListing.title}". Gostaria de conversar sobre ele.`;

  try {
    const response = await fetch(`${API}/negotiations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        listingId: selectedListing.id,
        content
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Não foi possível iniciar a negociação.');
    }

    setModal('');
    setNotice('Negociação iniciada com sucesso! A primeira mensagem foi enviada.');
  } catch (error) {
    setNotice(error.message);
  }
}
  async function sendMessage(event) {
    event.preventDefault();

    const content = messageDraft.trim();

    if (!content || !selectedNegotiation) return;

    try {
      const response = await fetch(
        `${API}/negotiations/${selectedNegotiation.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ content })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível enviar a mensagem.');
      }

      setNegotiations((current) =>
        current.map((item) =>
          item.id === selectedNegotiation.id
            ? { ...item, messages: [...item.messages, data.message] }
            : item
        )
      );

      setSelectedNegotiation((current) => ({
        ...current,
        messages: [...current.messages, data.message]
      }));

      setMessageDraft('');
      setNotice('Mensagem enviada com sucesso!');
    } catch (error) {
      setNotice(error.message);
    }
  }
  function logout() { localStorage.removeItem('movexa-token'); localStorage.removeItem('movexa-user'); setToken(''); setUser(null); }
  const filtered = listings;

  return <>
    <header className="topbar"><div className="nav-wrap">
      <a className="brand" href="#inicio" aria-label="Movexa início"><span className="brand-mark">m</span><span>movexa<span className="brand-dot">.</span></span></a>
      <button className="mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Abrir menu">{mobileMenu ? <X /> : <Menu />}</button>
      <nav className={mobileMenu ? 'nav-links open' : 'nav-links'}><a href="#explorar" onClick={() => setMobileMenu(false)}>Explorar</a><a href="#categorias" onClick={() => setMobileMenu(false)}>Categorias</a><a href="#como-funciona" onClick={() => { setActiveView('home'); setMobileMenu(false); }}>Como funciona</a>{user && <button className="nav-view-button" onClick={() => { setActiveView('negotiations'); setMobileMenu(false); }}>Minhas negociações</button>}</nav>
      <div className="nav-actions">{user ? <><span className="welcome">Oi, {user.name.split(' ')[0]}</span><button className="btn btn-outline" onClick={logout}>Sair</button></> : <><button className="login-link" onClick={() => setModal('login')}>Entrar</button><button className="btn btn-dark" onClick={() => setModal('register')}>Criar conta <ArrowRight size={16} /></button></>}<button className="btn btn-orange nav-publish" onClick={() => user ? setModal('listing') : setModal('login')}>Anunciar grátis <span>＋</span></button></div>
    </div></header>

    {activeView === 'home' ? (<><main id="inicio"><section className="hero"><div className="hero-grid"><div className="hero-copy"><div className="eyebrow"><Sparkles size={14} /> O marketplace feito por estudantes</div><h1>Seu próximo capítulo começa <em>por aqui.</em></h1><p>Encontre o que precisa para estudar. Dê uma nova vida ao que já aprendeu. Tudo em uma comunidade só sua.</p><div className="hero-ctas"><a className="btn btn-orange btn-large" href="#explorar">Explorar materiais <ArrowRight size={17} /></a><button className="text-action" onClick={() => user ? setModal('listing') : setModal('register')}>Quero anunciar <span>↗</span></button></div><div className="social-proof"><div className="avatar-stack"><span>J</span><span>M</span><span>A</span><span>+</span></div><span><b>Feito para estudantes.</b><br />Compartilhado entre eles.</span></div></div><div className="hero-art"><div className="hero-orbit orbit-one"></div><div className="hero-orbit orbit-two"></div><div className="hero-book"><BookOpen size={96} strokeWidth={1.1} /><span>novas ideias,<br />novas possibilidades</span></div><div className="floating-card float-card-one"><span className="float-icon">↗</span><span><b>Conhecimento circula</b><small>e todo mundo cresce</small></span></div><div className="floating-card float-card-two"><span className="float-avatar">✦</span><span><b>Uma comunidade</b><small>que entende você</small></span></div><span className="sparkle sparkle-a">✳</span><span className="sparkle sparkle-b">✦</span></div></div><div className="hero-bottom"><span>MAIS ACESSO. MENOS DESPERDÍCIO.</span><span className="hero-line"></span><span>CONHECIMENTO EM MOVIMENTO <span className="orange">✳</span></span></div></section>

    <section className="search-section" id="explorar"><div className="section-heading"><div><span className="eyebrow">COMECE A DESCOBRIR</span><h2>O que você está <em>procurando?</em></h2></div><span className="result-note">Materiais que ajudam você a ir mais longe.</span></div><div className="search-panel"><Search size={20} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Busque livros, calculadoras, materiais..." aria-label="Buscar materiais" /><button className="btn btn-orange search-button" onClick={() => document.getElementById('catalog-grid')?.scrollIntoView({ behavior: 'smooth' })}>Buscar <ArrowRight size={16} /></button><button className="filter-button" onClick={() => document.getElementById('deal-filter')?.focus()} aria-label="Filtros"><SlidersHorizontal size={19} /></button></div>
      <div className="category-row" id="categorias"><button className={!category ? 'category-chip selected' : 'category-chip'} onClick={() => setCategory('')}>Tudo</button>{categories.map(({ name, icon: Icon, color }) => <button key={name} className={category === name ? 'category-chip selected' : 'category-chip'} onClick={() => setCategory(category === name ? '' : name)}><span className={`category-icon ${color}`}><Icon size={16} /></span>{name}</button>)}<label className="deal-select"><select id="deal-filter" value={dealType} onChange={(e) => setDealType(e.target.value)}><option value="">Modalidade</option><option value="SALE">Venda</option><option value="TRADE">Troca</option><option value="DONATION">Doação</option><option value="RENTAL">Aluguel</option></select><ChevronDown size={15} /></label></div>
      <div className="catalog-heading"><div><span className="eyebrow">SELECIONADOS PARA VOCÊ</span><h2>Encontre seu <em>próximo achado.</em></h2></div><a href="#explorar" className="view-all">Ver todos <ArrowRight size={16} /></a></div>
      {loading && <p className="status-message">Carregando materiais...</p>}
      <div className="catalog-grid" id="catalog-grid">{filtered.map((item) => <article className="product-card" key={item.id}><div className="product-image"><img src={item.imageUrl || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80'} alt={item.title} /><span className="deal-badge">{dealLabels[item.dealType] || item.dealType}</span><button className={favorites.includes(item.id) ? 'heart-button active' : 'heart-button'} onClick={() => setFavorites(favorites.includes(item.id) ? favorites.filter((id) => id !== item.id) : [...favorites, item.id])} aria-label="Favoritar anúncio"><Heart size={18} fill={favorites.includes(item.id) ? 'currentColor' : 'none'} /></button></div><div className="product-info"><span className="product-category">{item.category}</span><h3>{item.title}</h3><div className="product-meta"><span>{conditionLabels[item.condition] || 'Bom estado'}</span><span>·</span><span>{item.location}</span></div><div className="product-bottom"><div className="product-price">{money(item.price) || <span className="no-price">A combinar</span>}{item.dealType === 'RENTAL' && item.price != null && <small>/ período</small>}</div><button className="card-arrow" onClick={() => openListing(item)} aria-label="Ver anúncio"><ArrowRight size={18} /></button></div></div></article>)}{!loading && !filtered.length && <div className="empty-state"><BookOpen size={32} /><h3>Nenhum material encontrado</h3><p>Tente mudar a busca ou os filtros.</p></div>}</div>
    </section>

    <section className="mission" id="como-funciona"><div className="mission-inner"><div className="mission-badge"><ShieldCheck size={18} /> UM CICLO QUE FAZ SENTIDO</div><div className="mission-content"><h2>O que já ajudou alguém<br />pode ajudar <em>você também.</em></h2><p>A Movexa aproxima estudantes e faz materiais acadêmicos circularem. Mais acesso para quem precisa, mais propósito para o que ficaria parado.</p><button className="btn btn-orange" onClick={() => user ? setModal('listing') : setModal('register')}>Faça parte da comunidade <ArrowRight size={16} /></button></div><div className="mission-stat"><span>↗</span><b>Aprender<br />compartilhando.</b><small>Uma troca de valor, em todos os sentidos.</small></div></div></section>
    <section className="steps"><div className="section-heading"><div><span className="eyebrow">SIMPLES ASSIM</span><h2>Três passos. <em>Uma comunidade.</em></h2></div></div><div className="step-grid"><div className="step-card"><span>01</span><h3>Encontre</h3><p>Busque materiais de outros estudantes para sua próxima etapa.</p></div><div className="step-card"><span>02</span><h3>Converse</h3><p>Combine diretamente com quem está anunciando.</p></div><div className="step-card"><span>03</span><h3>Movimente</h3><p>Compre, troque, alugue ou doe. E passe o conhecimento adiante.</p></div></div></section>
    </main>

    <footer><div className="footer-main"><a className="brand footer-brand" href="#inicio"><span className="brand-mark">m</span><span>movexa<span className="brand-dot">.</span></span></a><p>Conhecimento em movimento.<br />Feito para quem está aprendendo.</p><div className="footer-links"><a href="#explorar">Explorar materiais</a><a href="#como-funciona">Como funciona</a><a href="mailto:oi@movexa.com.br">Fale com a gente</a></div></div><div className="footer-bottom"><span>© 2026 Movexa. Feito para estudantes, com propósito.</span><span>Mais acesso. Menos desperdício. <span className="orange">✳</span></span></div></footer>
    </>) : (
      <main className="negotiations-page">
        <section className="negotiations-container">
          <div className="negotiations-heading">
            <div>
              <span className="eyebrow">SUA COMUNIDADE</span>
              <h1>Minhas <em>negociações</em></h1>
              <p>Acompanhe suas conversas e combine os detalhes diretamente com outros estudantes.</p>
            </div>
            <button className="btn btn-outline" onClick={() => { setActiveView('home'); setSelectedNegotiation(null); }}>Voltar aos anúncios</button>
          </div>

          <div className="negotiations-layout">
            <aside className="negotiations-list">
              <h2>Conversas</h2>
              {loadingNegotiations ? <p>Carregando conversas...</p> :
                negotiations.length === 0 ? <p>Você ainda não possui negociações.</p> :
                negotiations.map((item) => {
                  const otherPerson = item.buyerId === user.id ? item.seller : item.buyer;
                  return (
                    <button key={item.id} className={`negotiation-item ${selectedNegotiation?.id === item.id ? 'selected' : ''}`} onClick={() => setSelectedNegotiation(item)}>
                      <strong>{otherPerson?.name || 'Estudante'}</strong>
                      <span>{item.listing?.title || 'Anúncio'}</span>
                      <small>{item.messages?.length || 0} mensagem(ns)</small>
                    </button>
                  );
                })
              }
            </aside>

            <section className="negotiation-chat">
              {selectedNegotiation ? (
                <>
                  <div className="negotiation-chat-header">
                    <div>
                      <h2>{selectedNegotiation.listing?.title || 'Negociação'}</h2>
                      <p>Com {((selectedNegotiation.buyerId === user.id ? selectedNegotiation.seller : selectedNegotiation.buyer)?.name) || 'Estudante'}</p>
                    </div>
                    <span>{selectedNegotiation.status || 'Em andamento'}</span>
                  </div>

                  <div className="negotiation-messages">
                    {selectedNegotiation.messages?.length ? selectedNegotiation.messages.map((message) => (
                      <div key={message.id} className={`negotiation-message ${message.senderId === user.id ? 'mine' : ''}`}>
                        <p>{message.content}</p>
                        <small>{new Date(message.createdAt).toLocaleString('pt-BR')}</small>
                      </div>
                    )) : <p className="negotiation-empty">Nenhuma mensagem ainda. Inicie a conversa!</p>}
                  </div>

                  <form className="negotiation-form" onSubmit={sendMessage}>
                    <input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Digite sua mensagem..." aria-label="Digite sua mensagem" />
                    <button className="btn btn-orange" type="submit" disabled={!messageDraft.trim()}>Enviar</button>
                  </form>
                </>
              ) : (
                <div className="negotiation-empty">
                  <h2>Suas conversas aparecem aqui</h2>
                  <p>Selecione uma negociação ao lado para visualizar as mensagens.</p>
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
    )}

    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Fechar aviso"><X size={15} /></button></div>}
    {modal === 'details' && selectedListing && (
      <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && setModal('')}>
        <section className="details-modal" role="dialog" aria-modal="true">
          <button className="modal-close" onClick={() => setModal('')} aria-label="Fechar">
            <X />
          </button>

          <span className="eyebrow">DETALHES DO MATERIAL</span>

          <div className="details-content">
            <img
              className="details-image"
              src={selectedListing.imageUrl || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80'}
              alt={selectedListing.title}
            />

            <div className="details-info">
              <span className="product-category">{selectedListing.category}</span>
              <h2>{selectedListing.title}</h2>

              <p className="details-description">
                {selectedListing.description || 'O anunciante não informou uma descrição para este material.'}
              </p>

              <p className="details-description">
                Conservação: {conditionLabels[selectedListing.condition] || 'Não informada'}
              </p>

              <p className="details-description">
                Modalidade: {dealLabels[selectedListing.dealType] || selectedListing.dealType}
              </p>

              <p className="details-description">
                Localização: {selectedListing.location || 'Não informada'}
              </p>

              <div className="details-price">
                {money(selectedListing.price) || 'A combinar'}
                {selectedListing.dealType === 'RENTAL' && selectedListing.price != null && <small> / período</small>}
              </div>

              <div className="details-seller">
                <strong>Vendedor:</strong> {selectedListing.owner?.name || 'Anunciante'}
                <br />
                <strong>Curso:</strong> {selectedListing.owner?.course || 'Não informado'}
                <br />
                <strong>Instituição:</strong> {selectedListing.owner?.institution || 'Não informada'}
              </div>

              <div className="details-actions">
                <button
                  className="btn btn-orange"
                  onClick={startNegotiation}
                >
                  Iniciar negociação <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    )}
    {modal && modal !== 'details' && <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && setModal('')}><section className="modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={() => setModal('')} aria-label="Fechar"><X /></button><span className="eyebrow">{modal === 'listing' ? 'PASSE ADIANTE' : 'BEM-VINDO À MOVEXA'}</span><h2>{modal === 'listing' ? 'Publique seu anúncio.' : modal === 'login' ? 'Que bom ter você de volta.' : 'Seu lugar também é aqui.'}</h2>
      {modal === 'listing' ? <form onSubmit={createListing} className="form-grid"><label>Título<input name="title" minLength="3" required placeholder="Ex.: Livro de Cálculo" /></label><label>Categoria<input name="category" required placeholder="Ex.: Livros" /></label><label className="full">Descrição<textarea name="description" required minLength="10" placeholder="Conte sobre o material..." /></label><label>Modalidade<select name="dealType"><option value="SALE">Venda</option><option value="TRADE">Troca</option><option value="DONATION">Doação</option><option value="RENTAL">Aluguel</option></select></label><label>Preço (R$)<input name="price" type="number" min="0" step="0.01" placeholder="Deixe em branco se não se aplica" /></label><label>Condição<select name="condition"><option value="GOOD">Bom estado</option><option value="NEW">Novo</option><option value="LIKE_NEW">Quase novo</option><option value="FAIR">Usado</option></select></label><label>Localização<input name="location" required defaultValue={user?.location || ''} placeholder="Cidade, UF" /></label><label className="full">Foto (URL)<input name="imageUrl" type="url" placeholder="https://..." /></label><button className="btn btn-orange full" type="submit">Enviar para aprovação <ArrowRight size={16} /></button></form> : <form onSubmit={submitAuth} className="form-grid">{modal === 'register' && <><label className="full">Nome completo<input name="name" minLength="2" required autoComplete="name" /></label><label>Instituição<input name="institution" required /></label><label>Curso<input name="course" required /></label><label className="full">Cidade, estado<input name="location" required placeholder="Ex.: São Paulo, SP" /></label></>}<label className="full">E-mail<input name="email" type="email" required autoComplete="email" /></label><label className="full">Senha<input name="password" type="password" minLength="10" required autoComplete={modal === 'login' ? 'current-password' : 'new-password'} />{modal === 'register' && <small>Mínimo de 10 caracteres.</small>}</label><button className="btn btn-orange full" type="submit">{modal === 'login' ? 'Entrar na minha conta' : 'Criar minha conta'} <ArrowRight size={16} /></button><p className="form-switch full">{modal === 'login' ? 'Ainda não tem conta?' : 'Já faz parte da Movexa?'} <button type="button" onClick={() => setModal(modal === 'login' ? 'register' : 'login')}>{modal === 'login' ? 'Cadastre-se' : 'Entrar'}</button></p></form>}
      <p className="privacy-note">Ao continuar, você concorda com nossos termos de uso e política de privacidade.</p></section></div>}
  </>;
}






