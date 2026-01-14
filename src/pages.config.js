import Home from './pages/Home';
import Drafts from './pages/Drafts';
import KnowledgeBase from './pages/KnowledgeBase';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Drafts": Drafts,
    "KnowledgeBase": KnowledgeBase,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};