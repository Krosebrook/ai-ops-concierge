import Home from './pages/Home';
import Drafts from './pages/Drafts';
import KnowledgeBase from './pages/KnowledgeBase';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Drafts": Drafts,
    "KnowledgeBase": KnowledgeBase,
    "AuditLog": AuditLog,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};