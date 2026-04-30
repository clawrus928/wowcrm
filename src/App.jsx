import { useState } from "react";
import { useCrmStore } from "./data/store.js";
import { useIsMobile } from "./utils.js";
import { T } from "./theme.js";
import { Sidebar } from "./views/Sidebar.jsx";
import { MobileBottomNav } from "./views/MobileBottomNav.jsx";
import { LeadsView } from "./views/Leads.jsx";
import { CustomersView } from "./views/Customers.jsx";
import { ContactsView } from "./views/Contacts.jsx";
import { DealsView } from "./views/Deals.jsx";
import { ContractsView } from "./views/Contracts.jsx";
import { QuotesView } from "./views/Quotes.jsx";
import { PipelineView } from "./views/Pipeline.jsx";
import { DashboardView } from "./views/Dashboard.jsx";
import { ChannelsView } from "./views/Channels.jsx";
import { SuppliersView } from "./views/Suppliers.jsx";
import { LoginView } from "./views/Login.jsx";

const VIEW_TITLES = {
  dashboard: "儀表板",
  leads: "線索",
  customers: "客戶",
  contacts: "聯系人",
  deals: "商機",
  pipeline: "Pipeline",
  contracts: "合同",
  quotes: "報價單",
  channels: "渠道方",
  suppliers: "供應商",
};

export default function App() {
  const store = useCrmStore();
  const isMobile = useIsMobile();
  const [view, setView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contactSeed, setContactSeed] = useState(null);
  const [dealSeed, setDealSeed] = useState(null);
  const [channelSeed, setChannelSeed] = useState(null);
  const [leadSeed, setLeadSeed] = useState(null);
  const [customerSeed, setCustomerSeed] = useState(null);
  const [supplierSeed, setSupplierSeed] = useState(null);

  if (!store.currentUser) {
    return <LoginView onLogin={store.login} />;
  }

  const openContact = (id) => {
    setContactSeed({ mode: "detail", id });
    setView("contacts");
  };
  const openDeal = (id) => {
    setDealSeed({ mode: "detail", id });
    setView("deals");
  };
  const openChannel = (id) => {
    setChannelSeed({ mode: "detail", id });
    setView("channels");
  };
  const openLead = (id) => {
    setLeadSeed({ mode: "detail", id });
    setView("leads");
  };
  const openCustomer = (id) => {
    setCustomerSeed({ mode: "detail", id });
    setView("customers");
  };
  const openSupplier = (id) => {
    setSupplierSeed({ mode: "detail", id });
    setView("suppliers");
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        background: T.bg,
        fontFamily: T.font,
        overflow: "hidden",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        body { margin: 0; }
        input, select, textarea { font-size: 16px; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        input:focus, select:focus, textarea:focus { border-color: ${T.accent} !important; }
        tr:active { background: ${T.surfaceAlt}; }
      `}</style>

      <Sidebar
        active={view}
        onChange={setView}
        isMobile={isMobile}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUser={store.currentUser}
        onLogout={store.logout}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          paddingBottom: isMobile ? 56 : 0,
        }}
      >
        {isMobile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderBottom: `1px solid ${T.border}`,
              background: T.surface,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: "none",
                border: "none",
                fontSize: 20,
                cursor: "pointer",
                color: T.textSecondary,
                padding: 4,
                display: "flex",
              }}
            >
              ☰
            </button>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
              {VIEW_TITLES[view] || "CRM"}
            </span>
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {view === "dashboard" && <DashboardView store={store} />}
          {view === "leads" && (
            <LeadsView
              store={store}
              drawerSeed={leadSeed}
              onConsumeSeed={() => setLeadSeed(null)}
              onOpenChannel={openChannel}
            />
          )}
          {view === "customers" && (
            <CustomersView
              store={store}
              drawerSeed={customerSeed}
              onConsumeSeed={() => setCustomerSeed(null)}
              onOpenContact={openContact}
              onOpenDeal={openDeal}
              onOpenChannel={openChannel}
            />
          )}
          {view === "contacts" && (
            <ContactsView
              store={store}
              drawerSeed={contactSeed}
              onConsumeSeed={() => setContactSeed(null)}
            />
          )}
          {view === "deals" && (
            <DealsView
              store={store}
              drawerSeed={dealSeed}
              onConsumeSeed={() => setDealSeed(null)}
              onOpenSupplier={openSupplier}
            />
          )}
          {view === "pipeline" && (
            <PipelineView store={store} onOpenSupplier={openSupplier} />
          )}
          {view === "contracts" && <ContractsView store={store} />}
          {view === "quotes" && <QuotesView store={store} />}
          {view === "channels" && (
            <ChannelsView
              store={store}
              drawerSeed={channelSeed}
              onConsumeSeed={() => setChannelSeed(null)}
              onOpenLead={openLead}
              onOpenCustomer={openCustomer}
            />
          )}
          {view === "suppliers" && (
            <SuppliersView
              store={store}
              drawerSeed={supplierSeed}
              onConsumeSeed={() => setSupplierSeed(null)}
              onOpenDeal={openDeal}
            />
          )}
        </div>
      </div>

      {isMobile && <MobileBottomNav active={view} onChange={setView} />}
    </div>
  );
}
