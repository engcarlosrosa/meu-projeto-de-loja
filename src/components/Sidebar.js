// src/components/Sidebar.js
import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
// NOVO: Adicionado PackageSearch para Inventário
import { Home, Store, Package, ShoppingCart, BarChart2, Users, Settings, LogOut, DollarSign, Wallet, CreditCard, UserSquare, ClipboardList, FolderKanban, TrendingUp, ClipboardCheck, Bell, Check, X, XCircle, PackageSearch } from 'lucide-react';

// NOVO: Componente para o Modal de Aprovação de Descontos
const ApprovalModal = ({ isOpen, onClose, requests, onApprove, onReject }) => {
    if (!isOpen) return null;

    const formatCurrency = (value) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

    return (
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '700px'}}>
                <button onClick={onClose} style={styles.modalCloseButton}><XCircle size={24} /></button>
                <h2 style={styles.modalTitle}>Solicitações de Desconto Pendentes</h2>
                {requests.length === 0 ? (
                    <p>Nenhuma solicitação pendente no momento.</p>
                ) : (
                    <div style={styles.requestList}>
                        {requests.map(req => (
                            <div key={req.id} style={styles.requestItem}>
                                <div style={styles.requestHeader}>
                                    <span>Loja: <strong>{req.storeName || req.storeId}</strong></span>
                                    <span>Solicitante: <strong>{req.requesterInfo.name}</strong></span>
                                </div>
                                <div style={styles.requestBody}>
                                    <div style={styles.requestDetails}>
                                        <p><strong>Desconto Solicitado:</strong> {req.discount.value}{req.discount.type === '%' ? '%' : ' R$'}</p>
                                        <p><strong>Subtotal Carrinho:</strong> {formatCurrency(req.cartSnapshot.reduce((acc, item) => acc + item.price * item.quantity, 0))}</p>
                                        <ul style={styles.cartSnapshotList}>
                                            {req.cartSnapshot.map(item => (
                                                <li key={item.id + item.selectedSize}>{item.name} ({item.selectedColor}/{item.selectedSize}) x{item.quantity}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div style={styles.requestActions}>
                                        <button onClick={() => onApprove(req.id)} style={{...styles.approvalButton, ...styles.approveButton}}><Check size={18}/> Aprovar</button>
                                        <button onClick={() => onReject(req.id)} style={{...styles.approvalButton, ...styles.rejectButton}}><X size={18}/> Rejeitar</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


const baseSidebarStyles = {
  backgroundColor: '#34495e',
  color: 'white',
  paddingTop: '20px',
  paddingBottom: '20px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  height: '100vh',
  position: 'fixed',
  left: 0,
  top: 0,
  boxShadow: '2px 0 5px rgba(0,0,0,0.2)',
  zIndex: 1000,
  overflowY: 'auto',
  transition: 'width 0.3s ease-in-out, padding 0.3s ease-in-out',
};

const styles = {
  sidebarContainerExpanded: { width: '250px', paddingLeft: '20px', paddingRight: '20px', ...baseSidebarStyles },
  sidebarContainerCollapsed: { width: '60px', paddingLeft: '5px', paddingRight: '5px', alignItems: 'center', ...baseSidebarStyles },
  logoSection: { textAlign: 'center', marginBottom: '30px' },
  logoText: { fontSize: '2.2em', fontWeight: 'bold', margin: '0', color: '#ecf0f1' },
  logoTextCollapsed: { fontSize: '1.8em', fontWeight: 'bold', margin: '0', color: '#ecf0f1', textAlign: 'center' },
  logoSubtitle: { fontSize: '0.8em', opacity: '0.8', marginTop: '5px', color: '#bdc3c7' },
  nav: { flexGrow: 1, width: '100%' },
  navItem: { display: 'flex', alignItems: 'center', padding: '15px 25px', color: '#ecf0f1', textDecoration: 'none', fontSize: '1.1em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'background-color 0.2s ease, color 0.2s ease, padding 0.3s ease-in-out', position: 'relative' },
  navItemActive: { backgroundColor: '#2980b9', color: 'white', borderLeft: '5px solid #3498db' },
  userInfo: { textAlign: 'center', padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 'auto', transition: 'opacity 0.3s ease-in-out' },
  userInfoCollapsed: { padding: '10px 5px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 1 },
  loggedInAs: { fontSize: '0.8em', opacity: '0.7', marginBottom: '5px' },
  userEmail: { fontWeight: 'bold', fontSize: '0.95em', marginBottom: '3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  userRole: { fontSize: '0.8em', opacity: '0.9', marginBottom: '15px' },
  logoutButton: { backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoutButtonCollapsed: { backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '8px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8em', transition: 'background-color 0.2s ease' },
  // NOVO: Estilos para notificação e modal
  notificationBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: '#e74c3c',
    color: 'white',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '0.8em',
    fontWeight: 'bold',
  },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1050 },
  modalContent: { backgroundColor: 'white', color: '#333', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' },
  modalCloseButton: { position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer' },
  modalTitle: { fontSize: '1.5em', marginBottom: '20px', color: '#333', textAlign: 'center' },
  requestList: { display: 'flex', flexDirection: 'column', gap: '15px' },
  requestItem: { border: '1px solid #ddd', borderRadius: '8px', padding: '15px' },
  requestHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' },
  requestBody: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' },
  requestDetails: { flex: 1 },
  cartSnapshotList: { listStyle: 'none', padding: 0, fontSize: '0.9em', color: '#555', marginTop: '10px' },
  requestActions: { display: 'flex', flexDirection: 'column', gap: '10px' },
  approvalButton: { padding: '8px 15px', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9em' },
  approveButton: { backgroundColor: '#28a745' },
  rejectButton: { backgroundColor: '#dc3545' },
};

const Sidebar = () => {
  const { currentUser, userRole, logout } = useAuth();
  const { db } = useFirebase(); // Obter db do Firebase context
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // NOVO: Estados para o sistema de aprovação
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  // NOVO: Efeito para ouvir solicitações de desconto pendentes (apenas para admins)
  useEffect(() => {
    if (userRole !== 'admin' || !db) {
        setPendingRequests([]);
        return;
    }

    const requestsRef = collection(db, 'discount_requests');
    const q = query(requestsRef, where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPendingRequests(requests);
    }, (error) => {
        console.error("Erro ao ouvir solicitações de desconto:", error);
    });

    return () => unsubscribe();
  }, [db, userRole]);
  
  const handleApprovalAction = async (requestId, newStatus) => {
    if (!db || !currentUser) return;
    const requestDocRef = doc(db, 'discount_requests', requestId);
    try {
        await updateDoc(requestDocRef, {
            status: newStatus,
            resolvedBy: {
                id: currentUser.uid,
                email: currentUser.email
            },
            resolvedAt: serverTimestamp()
        });
    } catch (error) {
        console.error(`Erro ao ${newStatus} a solicitação:`, error);
    }
  };


  const navItems = [
      { name: 'Dashboard', path: '/', icon: <Home /> },
      { name: 'Lojas', path: '/stores', icon: <Store />, roles: ['admin'] },
      { name: 'Catálogo', path: '/products', icon: <Package />, roles: ['admin', 'manager'] },
      { name: 'Inventário', path: '/inventory', icon: <PackageSearch />, roles: ['admin', 'manager'] },
      { name: 'Vendas', path: '/sales', icon: <ShoppingCart />, roles: ['admin', 'employee', 'manager'] },
      { name: 'Contas a Pagar', path: '/purchases', icon: <ClipboardList />, roles: ['admin', 'finance'] },
      { name: 'Receitas', path: '/revenues', icon: <TrendingUp />, roles: ['admin', 'finance'] },
      { name: 'Clientes', path: '/customers', icon: <UserSquare />, roles: ['admin', 'employee', 'manager'] },
      { name: 'Fechamento de Caixa', path: '/cash-register', icon: <DollarSign />, roles: ['admin', 'employee', 'manager'] },
      { name: 'Contagem de Estoque', path: '/stock-count', icon: <ClipboardCheck />, roles: ['admin', 'manager'] },
      { name: 'Visão Financeira', path: '/financial-overview', icon: <Wallet />, roles: ['admin', 'finance'] },
      { name: 'Relatórios', path: '/reports', icon: <BarChart2 />, roles: ['admin', 'manager', 'finance'] },
      { name: 'Funcionários', path: '/users', icon: <Users />, roles: ['admin'] },
      { name: 'Atributos de Produtos', path: '/settings/product-attributes', icon: <Settings />, roles: ['admin'] },
      { name: 'Cat. de Receitas', path: '/settings/revenue-categories', icon: <FolderKanban />, roles: ['admin', 'finance'] },
      { name: 'Métodos de Pagamento', path: '/settings/payment-methods', icon: <CreditCard />, roles: ['admin', 'finance'] },
    ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <>
    <ApprovalModal 
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        requests={pendingRequests}
        onApprove={(id) => handleApprovalAction(id, 'approved')}
        onReject={(id) => handleApprovalAction(id, 'rejected')}
    />
    <div
      style={isExpanded ? styles.sidebarContainerExpanded : styles.sidebarContainerCollapsed}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div style={styles.logoSection}>
        {isExpanded ? (
          <>
            <h1 style={styles.logoText}>StyleHub</h1>
            <p style={styles.logoSubtitle}>Gestão de Lojas de Roupas</p>
          </>
        ) : (
          (<h1 style={styles.logoTextCollapsed}>SH</h1>)
        )}
      </div>
      <nav style={styles.nav}>
        {/* NOVO: Link para notificações */}
        {userRole === 'admin' && (
            <div onClick={() => setIsApprovalModalOpen(true)} style={{...styles.navItem, cursor: 'pointer'}} title="Solicitações Pendentes">
                <Bell />
                {isExpanded && <span style={{ marginLeft: '10px' }}>Aprovações</span>}
                {pendingRequests.length > 0 && (
                    <span style={styles.notificationBadge}>{pendingRequests.length}</span>
                )}
            </div>
        )}

        {navItems.map(item => {
          const hasPermission = !item.roles || (userRole && item.roles.includes(userRole));
          if (!hasPermission) return null;
          return (
            <NavLink key={item.name} to={item.path} style={({ isActive }) => ({ ...styles.navItem, ...(isActive ? styles.navItemActive : {}), paddingLeft: isExpanded ? '25px' : '15px' })} title={item.name}>
              {item.icon}
              {isExpanded && <span style={{ marginLeft: '10px' }}>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>
      {currentUser && (
        <div style={isExpanded ? styles.userInfo : styles.userInfoCollapsed}>
          {isExpanded ? (
            <>
              <p style={styles.loggedInAs}>Logado como:</p>
              <p style={styles.userEmail}>{currentUser.email}</p>
              {userRole && <p style={styles.userRole}>({userRole})</p>}
              <button onClick={handleLogout} style={styles.logoutButton}><LogOut size={20} style={{ marginRight: '8px' }} />Sair</button>
            </>
          ) : (
            <button onClick={handleLogout} style={styles.logoutButtonCollapsed} title="Sair"><LogOut size={20} /></button>
          )}
        </div>
      )}
    </div>
    </>
  );
};

export default Sidebar;
