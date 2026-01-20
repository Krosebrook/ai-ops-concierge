import Analytics from './pages/Analytics';
import AuditLog from './pages/AuditLog';
import ClientPortal from './pages/ClientPortal';
import Drafts from './pages/Drafts';
import Home from './pages/Home';
import KnowledgeBase from './pages/KnowledgeBase';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import WorkflowAutomation from './pages/WorkflowAutomation';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "AuditLog": AuditLog,
    "ClientPortal": ClientPortal,
    "Drafts": Drafts,
    "Home": Home,
    "KnowledgeBase": KnowledgeBase,
    "Settings": Settings,
    "Tasks": Tasks,
    "WorkflowAutomation": WorkflowAutomation,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};