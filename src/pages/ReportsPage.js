// src/pages/ReportsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { FileDown, Bot } from 'lucide-react';
import * as XLSX from 'xlsx';

// --- Funções Auxiliares ---
const formatCurrency = (value) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
const formatDate = (timestamp) => timestamp ? new Date(timestamp.seconds * 1000).toLocaleDateString('pt-BR') : 'N/A';

// --- Estilos ---
const styles = {
    container: { padding: '20px', fontFamily: "'Inter', sans-serif", backgroundColor: '#f0f2f5' },
    header: { color: '#1f2937', marginBottom: '30px', fontSize: '2.2em', fontWeight: 'bold' },
    section: { backgroundColor: '#fff', padding: '25px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' },
    sectionTitle: { color: '#2c3e50', fontSize: '1.6em', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' },
    reportSelector: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
    reportButton: { padding: '10px 20px', border: '2px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#fff', fontWeight: '600', transition: 'all 0.2s ease' },
    reportButtonActive: { backgroundColor: '#007bff', color: 'white', borderColor: '#007bff' },
    filtersContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '20px' },
    inputGroup: { display: 'flex', flexDirection: 'column' },
    label: { marginBottom: '5px', fontWeight: '500', color: '#374151' },
    input: { padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' },
    button: { padding: '10px 20px', borderRadius: '6px', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' },
    resultsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
    exportButtons: { display: 'flex', gap: '10px' },
    tableContainer: { overflowX: 'auto', marginTop: '20px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    tableHeader: { backgroundColor: '#f3f4f6', fontWeight: 'bold', textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' },
    tableRow: { borderBottom: '1px solid #e5e7eb' },
    tableCell: { padding: '12px', verticalAlign: 'middle' },
    summaryContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '20px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' },
    summaryCard: { textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '15px', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    summaryLabel: { color: '#6b7280', fontSize: '0.9em', marginBottom: '8px' },
    summaryValue: { fontSize: '1.5em', fontWeight: 'bold' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto' },
    modalTitle: { fontSize: '1.5em', marginBottom: '20px' },
    aiResponse: { whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#333' },
};

const ReportsPage = () => {
    const { userRole } = useAuth();
    const { db, appId } = useFirebase();

    const [reportType, setReportType] = useState('sales');
    const [filters, setFilters] = useState({ startDate: '', endDate: '', storeId: 'all', userId: 'all', paymentMethod: 'all', productSort: 'quantity_desc' });
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [stores, setStores] = useState([]);
    const [users, setUsers] = useState([]);

    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        const fetchFilterData = async () => {
            if (!db || (userRole !== 'admin' && userRole !== 'finance' && userRole !== 'manager')) return;
            const storesSnapshot = await getDocs(collection(db, 'stores'));
            setStores(storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            const usersSnapshot = await getDocs(collection(db, 'users'));
            setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchFilterData();
    }, [db, userRole]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleGenerateReport = useCallback(async () => {
        if (!filters.startDate || !filters.endDate) {
            alert("Por favor, selecione um período de datas.");
            return;
        }
        setIsLoading(true);
        setReportData(null);

        const start = Timestamp.fromDate(new Date(filters.startDate + 'T00:00:00'));
        const end = Timestamp.fromDate(new Date(filters.endDate + 'T23:59:59'));
        
        let storeIdsToQuery = filters.storeId === 'all' ? stores.map(s => s.id) : [filters.storeId];

        // Coleta de Vendas
        const allSales = [];
        for (const storeId of storeIdsToQuery) {
            const salesRef = collection(db, `artifacts/${appId}/stores/${storeId}/sales`);
            let salesQuery = query(salesRef, where('date', '>=', start), where('date', '<=', end));
            if (filters.userId !== 'all') {
                salesQuery = query(salesQuery, where('sellerInfo.id', '==', filters.userId));
            }
            const salesSnapshot = await getDocs(salesQuery);
            salesSnapshot.forEach(doc => allSales.push({ id: doc.id, ...doc.data() }));
        }

        if (reportType === 'sales') {
            const totalSales = allSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const totalCost = allSales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + ((item.costPricePerUnit || 0) * item.quantity), 0), 0);
            const grossProfit = totalSales - totalCost;
            setReportData({ type: 'sales', data: allSales, summary: { totalSales, totalCost, grossProfit } });
        } 
        else if (reportType === 'products') {
            const productPerformance = {};
            allSales.forEach(sale => {
                sale.items.forEach(item => {
                    const key = item.productId + '-' + item.selectedColor + '-' + item.selectedSize;
                    if (!productPerformance[key]) {
                        productPerformance[key] = { name: item.productName, variation: `${item.selectedColor} / ${item.selectedSize}`, quantity: 0, revenue: 0 };
                    }
                    productPerformance[key].quantity += item.quantity;
                    productPerformance[key].revenue += item.subtotal;
                });
            });

            let sortedData = Object.values(productPerformance);
            if(filters.productSort === 'quantity_desc') sortedData.sort((a, b) => b.quantity - a.quantity);
            if(filters.productSort === 'revenue_desc') sortedData.sort((a, b) => b.revenue - a.revenue);
            if(filters.productSort === 'quantity_asc') sortedData.sort((a, b) => a.quantity - b.quantity);

            setReportData({ type: 'products', data: sortedData });
        }
        else if (reportType === 'financial') {
            // Cálculos baseados em vendas já coletadas
            const totalSales = allSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const totalCostOfGoods = allSales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + ((item.costPricePerUnit || 0) * item.quantity), 0), 0);
            
            // Busca de Outras Receitas (são globais)
            let otherRevenues = 0;
            if (filters.storeId === 'all') {
                const revenuesQuery = query(collection(db, 'revenues'), where('receivedDate', '>=', start), where('receivedDate', '<=', end));
                const otherRevenuesSnap = await getDocs(revenuesQuery);
                otherRevenues = otherRevenuesSnap.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
            }

            // ALTERAÇÃO: Busca de Despesas agora filtra por loja
            let expensesQuery = query(collection(db, 'accountsPayable'), where('type', '==', 'expense'), where('paidDate', '>=', start), where('paidDate', '<=', end));
            if(filters.storeId !== 'all') {
                expensesQuery = query(expensesQuery, where('storeId', '==', filters.storeId));
            }
            const expensesSnap = await getDocs(expensesQuery);
            const operationalExpenses = expensesSnap.docs.reduce((sum, doc) => sum + doc.data().totalAmount, 0);

            const totalRevenue = totalSales + otherRevenues;
            const grossProfit = totalSales - totalCostOfGoods;
            const netProfit = grossProfit + otherRevenues - operationalExpenses;

            setReportData({ type: 'financial', summary: { totalRevenue, totalCostOfGoods, grossProfit, operationalExpenses, netProfit } });
        }

        setIsLoading(false);
    }, [db, appId, filters, reportType, stores]);

    const handleExport = (format) => {
        if (!reportData) {
            alert("Não há dados para exportar.");
            return;
        }

        let dataToExport;
        if (reportType === 'sales') {
            if(!reportData.data || reportData.data.length === 0) return alert("Não há vendas para exportar.");
            dataToExport = reportData.data.map(sale => ({
                'Data': formatDate(sale.date),
                'Loja': stores.find(s => s.id === sale.storeId)?.name || sale.storeId,
                'Vendedor': sale.sellerInfo.name,
                'Cliente': sale.customerInfo.name,
                'Valor Total': sale.totalAmount,
                'Itens': sale.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')
            }));
        } else if (reportType === 'products') {
            if(!reportData.data || reportData.data.length === 0) return alert("Não há produtos para exportar.");
            dataToExport = reportData.data;
        } else if(reportType === 'financial') {
            dataToExport = [
                {"Indicador": "Receita Total (Vendas + Outras)", "Valor": reportData.summary.totalRevenue},
                {"Indicador": "Custo da Mercadoria Vendida", "Valor": reportData.summary.totalCostOfGoods},
                {"Indicador": "Lucro Bruto", "Valor": reportData.summary.grossProfit},
                {"Indicador": "Despesas Operacionais", "Valor": reportData.summary.operationalExpenses},
                {"Indicador": "Lucro Líquido", "Valor": reportData.summary.netProfit}
            ];
        } else {
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio");
        const fileName = `relatorio_${reportType}_${filters.startDate}_a_${filters.endDate}.${format}`;

        if (format === 'xlsx') {
            XLSX.writeFile(workbook, fileName);
        } else {
            const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleAiAnalysis = async () => {
        if (!reportData) {
            alert("Gere um relatório primeiro para poder analisar.");
            return;
        }
        setIsAiModalOpen(true);
        setIsAiLoading(true);
        setAiResponse('');

        const dataSample = (reportData.data && reportData.data.length > 0 ? reportData.data : [reportData.summary]).slice(0, 50);
        const promptData = JSON.stringify(dataSample);

        const systemPrompt = `Você é um analista de negócios especialista em varejo de moda. Analise os seguintes dados de um relatório e forneça insights acionáveis.
        - Identifique as principais tendências, padrões ou anomalias.
        - Destaque os pontos fortes e fracos revelados pelos dados.
        - Forneça 3 sugestões estratégicas e práticas para o gestor da loja com base na sua análise.
        - Formate sua resposta de forma clara e organizada usando markdown.`;
        
        const userQuery = `Por favor, analise os seguintes dados do relatório de ${reportType}: ${promptData}`;

        try {
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let errorDetails = `API Error: ${response.status} ${response.statusText}`;
                try {
                    const errorJson = await response.json();
                    if (errorJson && errorJson.error && errorJson.error.message) {
                        errorDetails = `Erro da API: ${errorJson.error.message}`;
                    }
                } catch (e) {
                    // Ignora
                }
                throw new Error(errorDetails);
            }

            const result = await response.json();
            const text = result.candidates[0].content.parts[0].text;
            setAiResponse(text);

        } catch (err) {
            setAiResponse(`Ocorreu um erro ao contatar a IA: ${err.message}`);
        } finally {
            setIsAiLoading(false);
        }
    };


    if (userRole !== 'admin' && userRole !== 'finance' && userRole !== 'manager') {
        return <div style={styles.container}><h1 style={styles.header}>Acesso Negado</h1></div>;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Relatórios</h1>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>1. Selecione o Tipo de Relatório</h2>
                <div style={styles.reportSelector}>
                    <button onClick={() => setReportType('sales')} style={reportType === 'sales' ? {...styles.reportButton, ...styles.reportButtonActive} : styles.reportButton}>Vendas Detalhado</button>
                    <button onClick={() => setReportType('products')} style={reportType === 'products' ? {...styles.reportButton, ...styles.reportButtonActive} : styles.reportButton}>Desempenho de Produtos</button>
                    <button onClick={() => setReportType('financial')} style={reportType === 'financial' ? {...styles.reportButton, ...styles.reportButtonActive} : styles.reportButton}>Financeiro (DRE)</button>
                </div>
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>2. Defina os Filtros</h2>
                <div style={styles.filtersContainer}>
                    <div style={styles.inputGroup}><label style={styles.label}>Data Início</label><input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} style={styles.input} /></div>
                    <div style={styles.inputGroup}><label style={styles.label}>Data Fim</label><input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} style={styles.input} /></div>
                    
                    {/* ALTERAÇÃO: Filtro de loja agora aparece para o relatório financeiro */}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Loja</label>
                        <select name="storeId" value={filters.storeId} onChange={handleFilterChange} style={styles.input}>
                            <option value="all">Todas as Lojas</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    {reportType === 'sales' && (
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Funcionário</label>
                            <select name="userId" value={filters.userId} onChange={handleFilterChange} style={styles.input}>
                                <option value="all">Todos</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                            </select>
                        </div>
                    )}
                    
                    {reportType === 'products' && (
                         <div style={styles.inputGroup}>
                            <label style={styles.label}>Ordenar Por</label>
                            <select name="productSort" value={filters.productSort} onChange={handleFilterChange} style={styles.input}>
                                <option value="quantity_desc">Mais Vendidos (Qtd)</option>
                                <option value="revenue_desc">Mais Vendidos (R$)</option>
                                <option value="quantity_asc">Menos Vendidos (Qtd)</option>
                            </select>
                        </div>
                    )}
                </div>
                <button onClick={handleGenerateReport} style={{...styles.button, backgroundColor: '#007bff', width: '100%'}} disabled={isLoading}>
                    {isLoading ? 'Gerando...' : 'Gerar Relatório'}
                </button>
            </div>

            {reportData && (
                <div style={styles.section}>
                    <div style={styles.resultsHeader}>
                        <h2 style={styles.sectionTitle}>3. Resultados</h2>
                        <div style={styles.exportButtons}>
                            <button onClick={handleAiAnalysis} style={{...styles.button, backgroundColor: '#581c87'}}><Bot size={18}/> Analisar com IA</button>
                            <button onClick={() => handleExport('csv')} style={{...styles.button, backgroundColor: '#10b981'}}><FileDown size={18}/> CSV</button>
                            <button onClick={() => handleExport('xlsx')} style={{...styles.button, backgroundColor: '#16a34a'}}><FileDown size={18}/> Excel</button>
                        </div>
                    </div>
                    
                    {reportData.type === 'financial' && reportData.summary && <RenderFinancialSummary summary={reportData.summary} />}
                    {reportData.type === 'sales' && <RenderSalesTable data={reportData.data} summary={reportData.summary} stores={stores} />}
                    {reportData.type === 'products' && <RenderProductsTable data={reportData.data} />}
                </div>
            )}

            {isAiModalOpen && (
                <div style={styles.modalOverlay} onClick={() => setIsAiModalOpen(false)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h2 style={styles.modalTitle}>Análise de Inteligência Artificial</h2>
                        {isAiLoading ? <p>Analisando dados, por favor aguarde...</p> : <div style={styles.aiResponse}>{aiResponse}</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Componentes de Renderização ---
const RenderSalesTable = ({ data, summary, stores }) => (
    <>
        <div style={styles.summaryContainer}>
            <div style={styles.summaryCard}><span style={styles.summaryLabel}>Faturamento Bruto</span><span style={styles.summaryValue}>{formatCurrency(summary.totalSales)}</span></div>
            <div style={styles.summaryCard}><span style={styles.summaryLabel}>Custo de Mercadoria</span><span style={styles.summaryValue}>{formatCurrency(summary.totalCost)}</span></div>
            <div style={styles.summaryCard}><span style={styles.summaryLabel}>Lucro Bruto</span><span style={{...styles.summaryValue, color: summary.grossProfit > 0 ? '#16a34a' : '#ef4444'}}>{formatCurrency(summary.grossProfit)}</span></div>
        </div>
        <div style={styles.tableContainer}>
            <table style={styles.table}>
                <thead><tr><th style={styles.tableHeader}>Data</th><th style={styles.tableHeader}>Loja</th><th style={styles.tableHeader}>Vendedor</th><th style={styles.tableHeader}>Valor</th></tr></thead>
                <tbody>{data.map(sale => <tr key={sale.id} style={styles.tableRow}><td style={styles.tableCell}>{formatDate(sale.date)}</td><td style={styles.tableCell}>{stores.find(s => s.id === sale.storeId)?.name || sale.storeId}</td><td style={styles.tableCell}>{sale.sellerInfo.name}</td><td style={styles.tableCell}>{formatCurrency(sale.totalAmount)}</td></tr>)}</tbody>
            </table>
        </div>
    </>
);

const RenderProductsTable = ({ data }) => (
    <div style={styles.tableContainer}>
        <table style={styles.table}>
            <thead><tr><th style={styles.tableHeader}>Produto</th><th style={styles.tableHeader}>Variação</th><th style={styles.tableHeader}>Quantidade Vendida</th><th style={styles.tableHeader}>Receita Gerada</th></tr></thead>
            <tbody>{data.map((p, i) => <tr key={i} style={styles.tableRow}><td style={styles.tableCell}>{p.name}</td><td style={styles.tableCell}>{p.variation}</td><td style={styles.tableCell}>{p.quantity}</td><td style={styles.tableCell}>{formatCurrency(p.revenue)}</td></tr>)}</tbody>
        </table>
    </div>
);

const RenderFinancialSummary = ({ summary }) => (
    <div style={styles.summaryContainer}>
        <div style={styles.summaryCard}><span style={styles.summaryLabel}>Receita Total (Vendas + Outras)</span><span style={{...styles.summaryValue, color: '#10b981'}}>{formatCurrency(summary.totalRevenue)}</span></div>
        <div style={styles.summaryCard}><span style={styles.summaryLabel}>Custo da Mercadoria Vendida</span><span style={{...styles.summaryValue, color: '#f97316'}}>{formatCurrency(summary.totalCostOfGoods)}</span></div>
        <div style={styles.summaryCard}><span style={styles.summaryLabel}>Lucro Bruto</span><span style={{...styles.summaryValue, color: '#3b82f6'}}>{formatCurrency(summary.grossProfit)}</span></div>
        <div style={styles.summaryCard}><span style={styles.summaryLabel}>Despesas Operacionais</span><span style={{...styles.summaryValue, color: '#ef4444'}}>{formatCurrency(summary.operationalExpenses)}</span></div>
        <div style={{...styles.summaryCard, gridColumn: '1 / -1', marginTop: '20px'}}><span style={styles.summaryLabel}>Lucro Líquido</span><span style={{...styles.summaryValue, fontSize: '2em', color: summary.netProfit > 0 ? '#16a34a' : '#ef4444'}}>{formatCurrency(summary.netProfit)}</span></div>
    </div>
);

export default ReportsPage;

