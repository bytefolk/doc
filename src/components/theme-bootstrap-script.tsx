export const THEME_BOOTSTRAP_SCRIPT = `!function(){try{var e=document.documentElement,t=localStorage.getItem('theme')||'light';if(t==='system'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t!=='dark'&&t!=='light'){t='light'}e.dataset.theme=t;e.classList.remove('light','dark');e.classList.add(t)}catch(e){document.documentElement.dataset.theme='light';document.documentElement.classList.add('light')}}()`

/** Applies both next-themes' class contract and the shared token attribute before first paint. */
export default function ThemeBootstrapScript() {
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
}
