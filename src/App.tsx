import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Asterisk, Check, ChevronDown,
  CircleHelp, ExternalLink, FileText, Github, Globe, Inbox, Layers3,
  LayoutDashboard, Link2, LoaderCircle, LockKeyhole, LogOut, Mail, Menu, MessageSquare, Moon,
  Pencil, Plus, Save, Search, Send, Settings2, Sparkles, Trash2, Upload, UserRound,
  X, Eye, EyeOff, CalendarDays, Clock3, FolderKanban, BookOpen, Sun,
} from 'lucide-react'
import { defaultServices, fallbackPosts, fallbackProjects, fallbackSettings } from './fallback'

type Settings = typeof fallbackSettings
type Project = typeof fallbackProjects[number] & { cover?: string; updatedAt?: string; liveUrl?: string; sourceUrl?: string }
type Post = typeof fallbackPosts[number] & { updatedAt?: string; seoTitle?: string; metaDescription?: string }
type Inquiry = { id: string; name: string; email: string; company?: string; type?: string; budget?: string; message: string; createdAt: string; readAt?: string | null }
type Stats = { email: string; counts: { posts: number; publishedPosts: number; projects: number; publishedProjects: number; inquiries: number; unread: number } }
type ViewName = 'overview' | 'posts' | 'projects' | 'inquiries' | 'settings'

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } })
  const text = await response.text()
  let payload: any = {}
  try { payload = text ? JSON.parse(text) : {} } catch { payload = { error: text || 'Unexpected response.' } }
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`)
  return payload as T
}

function Brand({ compact = false, reveal = false }: { compact?: boolean; reveal?: boolean }) {
  return <span className={`brand-lockup ${compact ? 'brand-lockup-compact' : ''} ${reveal ? 'brand-lockup-reveal' : ''}`}>
    {reveal ? <><span className="brand-name reference-brand-name">KRISH <span className="brand-reveals">REVEALS</span><span className="brand-name-dot">.</span></span><span className="brand-byline">KRISH SARKAR</span></> : <span className="brand-name reference-brand-name">KRISH SARKAR<span className="brand-name-dot">.</span></span>}
  </span>
}
function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0, visible: false, hovered: false })

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return

    document.body.classList.add('has-custom-cursor')

    const handlePointerMove = (event: PointerEvent) => {
      setPosition((current) => ({ ...current, x: event.clientX, y: event.clientY, visible: true }))
    }

    const handlePointerLeave = () => {
      setPosition((current) => ({ ...current, visible: false }))
    }

    const handleHoverState = (event: Event) => {
      const target = event.target as HTMLElement | null
      const interactive = !!target && !!target.closest?.('a, button, input, textarea, select, .btn, .work-card, .post-card, .project-art, .service-trigger, .skill-card, .theme-toggle, .marquee-tile, .mini-project, .share-button, .filter-active, .text-link, .service-item, .related-project-card')
      setPosition((current) => ({ ...current, hovered: Boolean(interactive) }))
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerleave', handlePointerLeave)
    document.addEventListener('pointerover', handleHoverState)
    document.addEventListener('pointerout', handleHoverState)

    return () => {
      document.body.classList.remove('has-custom-cursor')
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', handlePointerLeave)
      document.removeEventListener('pointerover', handleHoverState)
      document.removeEventListener('pointerout', handleHoverState)
    }
  }, [])

  return <div aria-hidden="true" className={`custom-cursor ${position.visible ? 'is-visible' : ''} ${position.hovered ? 'cursor-hovered' : ''}`} style={{ transform: `translate(${position.x}px, ${position.y}px)` }} />
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow"><span className="eyebrow-dot" />{children}</div>
}

function SectionTitle({ kicker, title, note, index }: { kicker: string; title: ReactNode; note?: string; index?: string }) {
  return <div className="section-title"><div><Eyebrow>{kicker}</Eyebrow><h2>{title}</h2></div><div className="section-title-aside">{index && <span className="section-index">{index}</span>}{note && <p>{note}</p>}</div></div>
}

type Theme = 'light' | 'dark'

function Header({ settings, minimal = false, theme = 'light', onThemeToggle }: { settings: Settings; minimal?: boolean; theme?: Theme; onThemeToggle?: (origin: HTMLElement) => void }) {
  const [open, setOpen] = useState(false)
  const links = minimal
    ? [{ label: 'Journal', href: '/blog' }, { label: 'Reveals', href: '/#work' }]
    : [{ label: 'Home', href: '/#top' }, { label: 'Krish', href: '/#about' }, { label: 'Services', href: '/#services' }, { label: 'Reveals', href: '/#work' }, { label: 'Journal', href: '/blog' }, { label: 'Contact', href: '/#contact' }]
  return <header className="site-header reference-header"><a className="brand-home" href="/#top" aria-label="Krish Reveals by Krish Sarkar home"><Brand reveal /></a><nav className="header-nav" aria-label="Main navigation">{links.map((link) => <a href={link.href} key={link.label}>{link.label}</a>)}</nav><div className="header-right">{onThemeToggle && <button className="theme-toggle" type="button" onClick={(event) => onThemeToggle(event.currentTarget)} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} appearance`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} appearance`}>{theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}</button>}<span className="availability"><i />{settings.availability || 'Available for freelance work'}</span><a className="header-cta" href="/#contact">Reveal a project <ArrowUpRight size={15}/></a><button className="mobile-nav-toggle" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>{open ? <X size={20}/> : <Menu size={20}/>}</button></div>{open && <div className="mobile-nav-panel">{links.map((link) => <a href={link.href} key={link.label} onClick={() => setOpen(false)}>{link.label}<ArrowUpRight size={16}/></a>)}<a href="/#contact" onClick={() => setOpen(false)}>Reveal a project <ArrowUpRight size={16}/></a></div>}</header>
}

function ProjectArtwork({ project, large = false }: { project: Project; large?: boolean }) {
  const id = project.slug.toLowerCase()
  if (project.cover) return <div className={`project-art cover-art ${large ? 'project-art-large' : ''}`} style={{ background: project.accent || '#eef3ef' }}><img src={project.cover} alt={`${project.name} preview`} loading="lazy"/><span className="art-corner-label">PROJECT / {project.number}</span></div>
  return <div className={`project-art art-${id.replace(/[^a-z0-9-]/g, '')} ${large ? 'project-art-large' : ''}`} style={{ background: project.accent || '#e8f1eb' }}>
    <div className="art-topbar"><span className="art-mini-brand">{id === 'tablely' ? 'tablely' : id === 'instaly' ? 'instaly' : id === 'gym-os' ? 'FORM' : id === 'orbit' ? 'orbit' : id === 'attendance-system' ? 'CHECK-IN' : id === 'offscrpt' ? 'offscrpt' : id === 'personal-portfolio' ? 'KRISH' : 'S / S'}</span><span className="art-window-controls"><i/><i/><i/></span></div>
    {id === 'tablely' ? <div className="tablely-preview"><div className="tablely-sidebar"><b>TABLELY</b><span>Overview</span><span className="chosen">Live tables</span><span>Orders</span><span>Menu</span></div><div className="tablely-content"><div className="tablely-title"><small>MONDAY, 19 OCTOBER</small><b>Service overview</b><span>● Live</span></div><div className="table-stats"><div><small>Active tables</small><b>08 <i>↗</i></b></div><div><small>Open orders</small><b>12</b></div><div><small>Today’s sales</small><b>₹18.4k</b></div></div><div className="table-pills">{['T01 · 2 guests','T03 · Preparing','T08 · Ready','T12 · 4 guests'].map((x, i) => <div key={x}><i className={`table-status t-${i}`}/>{x}<ArrowUpRight size={12}/></div>)}</div></div></div>
      : id === 'instaly' ? <div className="instaly-preview"><div className="instaly-profile"><div className="instaly-avatar">k.</div><b>studio / krish</b><span>Design-minded things, shipped thoughtfully.</span></div><div className="instaly-links"><div>Selected work <ArrowUpRight size={12}/></div><div>Digital resources <ArrowUpRight size={12}/></div><div>Let’s collaborate <ArrowUpRight size={12}/></div></div><div className="instaly-sticker">YOUR<br/>SPACE.</div></div>
      : id === 'gym-os' ? <div className="gym-preview"><aside><span>F.</span><i/><i/><i/><i/></aside><div className="gym-main"><small>OWNER DASHBOARD / MONDAY</small><b>Good morning.</b><div className="gym-metrics"><div><small>Members</small><strong>284</strong><span>↑ 8 this week</span></div><div><small>Today’s check-ins</small><strong>76</strong><span>Live attendance</span></div></div><div className="gym-chart"><span>WEEKLY ATTENDANCE</span><div>{[38, 64, 48, 86, 58, 100, 74].map((v, i) => <i key={i} style={{ height: `${v}%` }}/>)}</div></div></div></div>
      : id === 'shahzad-securities' ? <div className="research-preview"><div className="research-head"><small>FIELDNOTE / MARKET LETTER</small><b>Beyond the<br/><i>daily noise.</i></b><span>Research with a longer view.</span></div><div className="research-chart"><div className="research-numbers"><span>WATCHLIST / 01</span><b>Market overview</b><small>INDEX MOVEMENT · 1M</small></div><svg viewBox="0 0 250 90" aria-label="Illustrative market chart"><path d="M0 65 C20 59 20 72 42 54 S72 51 83 39 S102 49 120 38 S145 44 164 26 S196 40 211 18 S230 21 250 9" fill="none" stroke="#14795e" strokeWidth="3"/><path d="M0 65 C20 59 20 72 42 54 S72 51 83 39 S102 49 120 38 S145 44 164 26 S196 40 211 18 S230 21 250 9 L250 90 L0 90Z" fill="#bfe9d7" opacity=".5"/></svg></div></div>
      : id === 'attendance-system' ? <div className="mini-product-preview attendance-preview"><div className="attendance-top"><b>Attendance</b><span>Today ↗</span></div><strong>86<span>%</span></strong><small>Students present today</small><div className="attendance-bars">{[48,75,58,94,70,85,66].map((v,i)=><i key={i} style={{height:`${v}%`}}/>)}</div><div className="attendance-bottom"><span>Present <b>248</b></span><span>Absent <b>39</b></span></div></div>
      : id === 'offscrpt' ? <div className="mini-product-preview offscrpt-preview"><div className="offscrpt-title"><small>INDEPENDENT GOODS / 001</small><b>Make room<br/>for good ideas.</b></div><div className="offscrpt-products"><i>PDF</i><i>UI</i><i>WEB</i></div><span>Digital products for the curious ↗</span></div>
      : id === 'personal-portfolio' ? <div className="mini-product-preview personal-preview"><small>KRISH SARKAR / PORTFOLIO</small><b>Creative code.<br/><em>Useful products.</em></b><div className="personal-lines"><i/><i/><i/></div><span>Selected work · Journal · Contact</span></div>
      : <div className="orbit-preview"><div className="orbit-orb"><span>o</span><i/><b/></div><div className="orbit-window"><div className="orbit-window-head"><span>ORBIT / LOCAL TASK</span><span className="live-dot">● Ready</span></div><b>What should we do?</b><p>Open the project folder and find the latest notes.</p><div className="orbit-command"><Sparkles size={12}/> Type a task… <ArrowUpRight size={12}/></div><div className="orbit-footer"><span>Target window locked</span><span>↳ paused</span></div></div></div>}
    <div className="art-index">{project.number} / ILLUSTRATIVE PREVIEW</div><span className="art-deco">✳</span>
  </div>
}

function PostCover({ post, compact = false }: { post: Post; compact?: boolean }) {
  if (post.cover) return <div className={`post-cover ${compact ? 'post-cover-compact' : ''}`} style={{ background: post.accent }}><img src={post.cover} alt="" loading="lazy"/></div>
  const title = post.title.replace(/[.!?]/g, '').split(' ').slice(0, compact ? 4 : 5)
  return <div className={`post-cover post-cover-generated ${compact ? 'post-cover-compact' : ''}`} style={{ background: post.accent || '#e1f1e9' }}><span className="cover-kicker">KRISH’S FIELD NOTES <Asterisk size={12}/></span><b>{title.join(' ')}</b><div className="cover-orbit"><i/><i/><span>k.</span></div><span className="cover-category">{post.category.toUpperCase()} / {post.readTime.toUpperCase()}</span></div>
}

function PostCard({ post, index = 0 }: { post: Post; index?: number }) {
  return <a className={`post-card reveal post-card-${index % 3}`} href={`/blog/${post.slug}`}><PostCover post={post} compact/><div className="post-meta"><span>{post.category}</span><span>{post.readTime}</span></div><h3>{post.title}</h3><p>{post.excerpt}</p><div className="post-card-bottom"><time>{formatDate(post.date)}</time><span>Read note <ArrowUpRight size={14}/></span></div></a>
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  return <a className={`work-card work-card-${index % 3}`} href={`/projects/${project.slug}`}><ProjectArtwork project={project}/><div className="work-card-caption"><div className="work-card-title"><span className="work-number">{project.number}</span><div><h3>{project.name}</h3><p>{project.tagline || project.description}</p></div></div><span className="work-open"><ArrowUpRight size={19}/></span></div><div className="work-card-tags"><span>{project.category}</span><span>{project.status}</span><span>{project.year}</span></div></a>
}

function Hero({ settings }: { settings: Settings }) {
  const reduceMotion = useReducedMotion()
  return <motion.section className="hero section-wrap reference-hero" id="top" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.65, ease: 'easeOut' }}>
    <div className="hero-grid">
      <div className="hero-left">
        <Eyebrow>KRISH REVEALS / PROJECTS, MADE REAL</Eyebrow>
        <h1 className="reveal-hero-title">Krish<br/><em>Reveals<span>.</span></em></h1>
        <p className="hero-build-statement">{[settings.headlineA, settings.headlineB, settings.headlineC].filter(Boolean).join(' ') || 'I BUILD DIGITAL EXPERIENCES'}</p>
        <div className="hero-understroke" aria-hidden="true">〰</div>
        <p className="hero-description">{settings.intro || 'I’m Krish Sarkar. I turn ideas into digital products, then bring the work to life in public.'}</p>
        <div className="hero-actions"><a className="btn btn-dark" href="#work">See the reveals <ArrowUpRight size={16}/></a><a className="btn btn-light" href="#contact">Reveal a project <Send size={14}/></a></div>
        <div className="hero-bottom-note"><span className="tiny-avatars"><i>K</i><i>✳</i><i>↗</i></span><span>Krish Sarkar · building in public</span></div>
      </div>
      <div className="hero-right reference-hero-art" aria-label="A collage introducing Krish’s development work">
        <div className="hero-grid-paper" />
        <div className="hero-photo-card">{settings.profileImage ? <img className="hero-personal-image" src={settings.profileImage} alt={`${settings.name} portrait`} loading="eager"/> : <div className="photo-silhouette"><span className="photo-shine"/><span className="portrait-head"/><span className="portrait-neck"/><span className="portrait-body"/><span className="portrait-shirt-line"/></div>}<span className="photo-card-stamp">KS / 2026</span></div>
        <div className="hero-id-card"><small>THE BUILDER</small><b>KRISH<br/>SARKAR<span>.</span></b><p>Ideas → products<br/>Code → live</p><span className="id-card-mark">✳</span></div>
        <div className="hero-mini-screen"><div className="mini-screen-top"><i/><i/><i/><span>project / reveal</span></div><div className="mini-screen-body"><b>From idea<br/><em>to live.</em></b><div className="mini-ui-row"><i/><i/><i/></div><span>Build · Reveal · Repeat ↗</span></div></div>
        <div className="hero-photo-small"><div className="mini-city"><span/><span/><span/><span/></div><b>MAKE IT.<br/>REVEAL IT.</b></div>
        <div className="hero-note note-top"><span>KRISH REVEALS</span><b>ideas into<br/>live projects.</b></div><div className="hero-note note-bottom"><span>BUILD IN PUBLIC</span><b>Show the<br/>whole process.</b></div>
        <span className="hero-sketch sketch-a">✳</span><span className="hero-sketch sketch-b">↗</span><span className="hero-sketch sketch-c">◎</span>
      </div>
    </div>
    <div className="hero-rail"><span><i/> {settings.availability.toUpperCase()}</span><span>{settings.location || 'WEB · PRODUCT · INTERACTION'}</span><a href="#work">SCROLL TO EXPLORE <ArrowDown size={13}/></a></div>
  </motion.section>
}

function TrustedTools() {
  const tools = ['Next.js', 'React', 'Supabase', 'Tailwind CSS', 'TypeScript', 'Node.js', 'Vercel', 'Figma', 'GitHub']
  return <div className="tools-strip section-wrap reference-tools"><span className="tools-label">TRUSTED BY GREAT TOOLS</span><div className="tools-list">{tools.map((tool, i) => <span key={tool}><b className={`tool-mark tool-${i}`}>{['N','⚛','◈','≋','TS','⬡','▲','◉','⌘'][i]}</b>{tool}</span>)}</div></div>
}

function MarqueeSection({ projects }: { projects: Project[] }) {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] })
  const rowOneX = useTransform(scrollYProgress, [0, 1], [-90, 40])
  const rowTwoX = useTransform(scrollYProgress, [0, 1], [70, -90])
  const firstRow = projects.slice(0, 5)
  const secondRow = [...projects].reverse().slice(0, 5)
  const renderTiles = (items: Project[], row: string) => [...items, ...items].map((project, index) => <a className="marquee-tile" href={`/projects/${project.slug}`} key={`${row}-${project.id}-${index}`} tabIndex={index >= items.length ? -1 : undefined} aria-hidden={index >= items.length ? true : undefined}><div className="marquee-tile-art"><ProjectArtwork project={project}/></div><div className="marquee-tile-meta"><span>{project.category}</span><b>{project.name}</b><ArrowUpRight size={15}/></div></a>)
  return <section className="project-marquee section-wrap" ref={sectionRef} aria-label="A moving preview of Krish Sarkar's live project reveals"><div className="marquee-heading"><Eyebrow>BUILT BY KRISH SARKAR / SHARED IN PUBLIC</Eyebrow><p>Ideas, now in the world <span>↘</span></p></div><div className="marquee-row marquee-row-one"><motion.div className="marquee-track" style={{ x: reduceMotion ? 0 : rowOneX }}>{renderTiles(firstRow, 'one')}</motion.div></div><div className="marquee-row marquee-row-two"><motion.div className="marquee-track" style={{ x: reduceMotion ? 0 : rowTwoX }}>{renderTiles(secondRow, 'two')}</motion.div></div><div className="marquee-footnote"><span>IDEA · BUILD · LIVE REVEAL</span><a href="#work">Watch the project reveals <ArrowUpRight size={14}/></a></div></section>
}

function ServicesSection({ settings }: { settings: Settings }) {
  const [activeService, setActiveService] = useState(0)
  const services = settings.services?.length ? settings.services : defaultServices
  const icons = [Globe, Layers3, FolderKanban, Sparkles, Settings2]
  return <section className="services-section section-wrap" id="services"><div className="services-layout"><div className="services-intro"><Eyebrow>WHAT I DO</Eyebrow><h2>Services<span>.</span></h2><p>From the first rough idea to a product ready for real people, I help build useful digital experiences with care for both design and engineering.</p><div className="services-stamp" aria-hidden="true"><span>THOUGHTFUL<br/>BY DESIGN<br/>BUILT TO WORK</span><Asterisk size={18}/></div><a className="btn btn-dark" href="#contact">Let’s work together <ArrowUpRight size={15}/></a></div><div className="service-list">{services.map((service, index) => { const Icon = icons[index % icons.length]; const isActive = activeService === index; return <article className={`service-item ${isActive ? 'service-item-active' : ''}`} key={`${service.title}-${index}`}><button className="service-trigger" type="button" aria-expanded={isActive} onClick={() => setActiveService(isActive ? -1 : index)}><span className="service-num">{String(index + 1).padStart(2, '0')}</span><span className="service-name">{service.title}</span><span className="service-toggle">{isActive ? <X size={15}/> : <ArrowUpRight size={15}/>}</span></button>{isActive && <div className="service-detail"><span className="service-icon"><Icon size={17}/></span><div><p>{service.description}</p><div className="tag-list"><i>{index === 0 ? 'Responsive UI' : index === 1 ? 'APIs & data' : index === 2 ? 'Product foundations' : index === 3 ? 'Interaction design' : 'Reliability'}</i><i>{index === 3 ? 'Motion' : 'Accessibility'}</i></div></div></div>}</article>})}</div></div></section>
}

function AboutSection({ settings }: { settings: Settings }) {
  return <section className="about-section section-wrap reference-about" id="about">
    <div className="about-layout">
      <div className="about-copy"><Eyebrow>ABOUT ME</Eyebrow><h2>Turning ideas<br/>into products<br/>people love<span>.</span></h2><p className="about-lead">I’m Krish — an engineering student and freelance web developer turning ideas into useful digital products.</p><p>{settings.about}</p><p>I enjoy turning ideas into products, exploring new tech and creating designs that feel natural. I care about the detail, but never lose sight of what the product needs to do.</p><a href="#contact" className="btn btn-light">Let’s connect <ArrowUpRight size={15}/></a></div>
      <div className="about-photo-area reference-about-art"><div className="about-polaroid"><div className="portrait-placeholder">{settings.profileImage ? <img className="about-personal-image" src={settings.profileImage} alt={`${settings.name} portrait`} loading="lazy"/> : <><div className="portrait-sun"/><div className="portrait-shape portrait-one"/><div className="portrait-shape portrait-two"/><span>KS</span></>}</div><div className="polaroid-caption"><b>KRISH SARKAR</b><span>BUILDING THINGS THAT MATTER</span></div><span className="polaroid-tape"/></div><div className="about-sticker">GOOD IDEAS<br/>TAKE TIME <span>↗</span></div><span className="photo-doodle doodle-one">✳</span><span className="photo-doodle doodle-two">↗</span></div>
      <div className="about-status-list"><div><i>◉</i><span><b>Based in India</b><small>Open to remote work</small></span></div><div><i>⌘</i><span><b>Focused on</b><small>Web apps, SaaS and clean UI</small></span></div><div><i>✳</i><span><b>Currently learning</b><small>AI tools, better design systems</small></span></div><div><i>♡</i><span><b>Fun fact</b><small>I love bikes, tech and good food</small></span></div></div>
    </div>
  </section>
}

function TimelineSection() {
  const entries = [
    { date: '2025 — Present', title: 'Independent Web Development', type: 'Personal & freelance projects', detail: 'Building web applications and SaaS products while strengthening product thinking, implementation, and the details of the user experience.', tags: ['Web Development', 'React', 'Supabase', 'UI/UX'] },
    { date: '2025 — Present', title: 'Personal Projects & Product Building', type: 'Independent', detail: 'Designing and shipping products including TABLELY, INSTALY, Gym SaaS and AI-assisted desktop workflows.', tags: ['Product Thinking', 'TypeScript', 'Open Source'] },
    { date: '2025 — Present', title: 'B.Tech · CSE (AI & ML)', type: 'JIS College of Engineering', detail: 'Learning computer science, programming, software development and the foundations behind reliable applications.', tags: ['Computer Science', 'AI / ML', 'Engineering'] },
  ]
  return <section className="now-section section-wrap reference-experience" id="experience"><div className="experience-intro"><Eyebrow>BUILDING & LEARNING</Eyebrow><h2>My journey<br/>so far<span>.</span></h2><p>Learning, building and turning ideas into products that people use.</p><a className="btn btn-dark" href="#contact">Work with me <ArrowUpRight size={15}/></a><span className="experience-doodle">↘</span></div><div className="experience-timeline">{entries.map((entry, i) => <article className="experience-row" key={entry.title}><time>{entry.date}</time><span className={`timeline-dot dot-${i}`}/><div className="experience-entry"><h3>{entry.title}</h3><small>{entry.type}</small><p>{entry.detail}</p><div className="experience-tags">{entry.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div></article>)}</div><div className="experience-note">Still learning.<br/><b>Always building.</b><span>✳</span></div></section>
}

function SkillsSection() {
  const tools = [
    { title: 'Next.js', sub: 'React framework', mark: 'N.' }, { title: 'React', sub: 'UI library', mark: '⚛' }, { title: 'TypeScript', sub: 'Typed JavaScript', mark: 'TS' }, { title: 'Node.js', sub: 'Backend runtime', mark: '⬡' }, { title: 'Supabase', sub: 'Database & auth', mark: '✦' }, { title: 'Tailwind CSS', sub: 'Styling system', mark: '≋' }, { title: 'PostgreSQL', sub: 'Relational data', mark: '◉' }, { title: 'Figma', sub: 'Design', mark: '◈' },
  ]
  const [active, setActive] = useState('Next.js')
  return <section className="skills-section"><div className="skills-inner section-wrap"><div className="skills-heading"><Eyebrow>SKILLS & TOOLS</Eyebrow><h2>Tools I use<br/>to build magic<span>.</span></h2></div><div className="skills-content"><div className="skills-cards">{tools.map(tool => <button key={tool.title} className={`skill-card ${active === tool.title ? 'skill-active' : ''}`} onClick={() => setActive(tool.title)} aria-pressed={active === tool.title}><b>{tool.mark}</b><span>{tool.title}</span></button>)}</div><div className="skills-caption"><span>FOCUSED ON {active.toUpperCase()}</span><p>{tools.find(tool => tool.title === active)?.sub} — chosen for clear interfaces, dependable systems, and products that can grow.</p></div></div><span className="skills-note">Always exploring<br/>new tools ✳</span></div></section>
}

function JournalSection({ posts }: { posts: Post[] }) {
  const [filter, setFilter] = useState('Everything')
  const [search, setSearch] = useState('')
  const categories = ['Everything', ...Array.from(new Set(posts.map((p) => p.category)))]
  const visible = useMemo(() => posts.filter((p) => (filter === 'Everything' || p.category === filter) && `${p.title} ${p.excerpt} ${p.content || ''} ${p.category} ${(p.tags || []).join(' ')}`.toLowerCase().includes(search.toLowerCase())).slice(0, 6), [posts, filter, search])
  return <section className="journal-section section-wrap" id="journal"><SectionTitle kicker="NOTES FROM THE PROCESS" title={<>The journal<span className="title-star">✳</span></>} note="Things I’m learning, building, and thinking through." index="05 / 06"/><div className="journal-topline"><div className="journal-filters">{categories.map((category) => <button key={category} className={filter === category ? 'filter-active' : ''} onClick={() => setFilter(category)}>{category}</button>)}</div><label className="journal-search"><Search size={15}/><input aria-label="Search journal" placeholder="Search notes" value={search} onChange={(e) => setSearch(e.target.value)}/>{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={13}/></button>}</label></div>{visible.length ? <div className="journal-grid">{visible.map((post, index) => <PostCard key={post.id} post={post} index={index}/>)}</div> : <div className="empty-state"><BookOpen size={20}/><p>No notes match that search yet.</p><button className="text-link" onClick={() => { setSearch(''); setFilter('Everything') }}>Clear filters <ArrowRight size={14}/></button></div>}<div className="journal-bottom"><span>WRITING AS I GO <Asterisk size={13}/></span><span>{posts.length.toString().padStart(2, '0')} NOTES IN THE JOURNAL</span></div></section>
}

function ContactSection({ settings }: { settings: Settings }) {
  const [form, setForm] = useState({ name: '', email: '', company: '', type: 'A website', budget: 'Not sure yet', message: '', website: '' })
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setStatus(null)
    try { const result = await api<{ message: string }>('/api/contact', { method: 'POST', body: JSON.stringify(form) }); setStatus({ kind: 'success', text: result.message }); setForm({ name: '', email: '', company: '', type: 'A website', budget: 'Not sure yet', message: '', website: '' }) }
    catch (error) { setStatus({ kind: 'error', text: error instanceof Error ? `${error.message} If the site is running without its API, email ${settings.email} directly after replacing the placeholder.` : 'Could not submit. Please try again.' }) }
    finally { setBusy(false) }
  }
  return <section className="contact-section section-wrap" id="contact"><div className="contact-heading"><div><Eyebrow>GOOD THINGS START HERE</Eyebrow><h2>Let’s build<br/><em>something.</em><span>✳</span></h2></div><div className="contact-heading-note"><p>Have an idea, a product to launch, or a website that needs a rethink? Tell me what you’re working on.</p>{settings.email?.trim() && !/your_email|example\.com/i.test(settings.email) ? <a href={`mailto:${settings.email}`} className="contact-email"><Mail size={16}/>{settings.email}<ArrowUpRight size={15}/></a> : <span className="contact-email-note">Use the project brief form below to get in touch.</span>}</div></div><div className="contact-layout"><div className="contact-side"><div className="contact-postit"><span className="postit-tape"/><b>Keep it simple.</b><p>What are you trying to make easier, clearer, or more useful?</p><span className="postit-doodle">~ ↗ ~</span></div><div className="contact-side-note"><span>01 / RESPONSE</span><p>I’ll review the details and get back to you using the email you provide.</p></div><div className="contact-side-note"><span>02 / NO PRESSURE</span><p>A useful first conversation is about fit and scope, not a sales pitch.</p></div></div><form className="contact-form" onSubmit={submit}><div className="form-title"><b>Tell me about it.</b><span>Fields with * are required</span></div><div className="form-row"><label><span>Your name *</span><input required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" maxLength={100}/></label><label><span>Email address *</span><input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" maxLength={240}/></label></div><label><span>Company or project <small>OPTIONAL</small></span><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="What should I call it?" maxLength={140}/></label><div className="form-row"><label><span>What are you building?</span><div className="select-wrap"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>A website</option><option>A web application</option><option>A SaaS product</option><option>An interactive experience</option><option>Something else</option></select><ChevronDown size={15}/></div></label><label><span>Approx. budget</span><div className="select-wrap"><select value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}><option>Not sure yet</option><option>Under ₹10,000</option><option>₹10,000–₹30,000</option><option>₹30,000–₹75,000</option><option>₹75,000+</option></select><ChevronDown size={15}/></div></label></div><label><span>The idea *</span><textarea required minLength={10} rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="The goal, the audience, the tricky bit…" maxLength={8000}/></label><label className="honeypot" aria-hidden="true"><span>Leave blank</span><input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}/></label><button className="btn btn-dark form-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16}/> : <Send size={15}/>} Send inquiry <ArrowUpRight size={15}/></button>{status && <p className={`form-status ${status.kind}`} role="status">{status.kind === 'success' ? <Check size={15}/> : <CircleHelp size={15}/>} {status.text}</p>}<p className="form-footnote">Your message is stored privately for follow-up. No spam, no mailing list.</p></form></div></section>
}

function Footer({ settings }: { settings: Settings }) {
  const emailConfigured = Boolean(settings.email?.trim() && !/your_email|example\.com/i.test(settings.email))
  return <footer className="site-footer section-wrap"><a href="/#top" className="footer-brand"><Brand reveal/></a><span className="footer-tagline">A build by Krish Sarkar. Revealed as it grows. <Asterisk size={13}/></span><nav className="footer-nav" aria-label="Footer navigation"><a href="/#about">About Krish</a><a href="/#services">Services</a><a href="/#work">Reveals</a><a href="/blog">Journal</a><a href="/#contact">Contact</a></nav>{emailConfigured && <a className="footer-email" href={`mailto:${settings.email}`}>{settings.email}</a>}<div className="footer-links">{settings.github && <a href={settings.github} target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={16}/></a>}{settings.linkedin && <a href={settings.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"><Link2 size={16}/></a>}{settings.instagram && <a href={settings.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><ExternalLink size={16}/></a>}<a href="/admin" aria-label="Admin login" className="footer-admin"><LockKeyhole size={12}/></a><a href="/#top" className="footer-back-top">Back to top <ArrowUpRight size={13}/></a></div><span className="footer-availability">{settings.availability || 'Available for freelance work'}</span><span className="footer-copy">© {new Date().getFullYear()} KRISH SARKAR · KRISH REVEALS</span></footer>
}

function Portfolio({ settings, projects, posts, theme, onThemeToggle }: { settings: Settings; projects: Project[]; posts: Post[]; theme: Theme; onThemeToggle: (origin: HTMLElement) => void }) {
  const [filter, setFilter] = useState('All work')
  const [expandedProjects, setExpandedProjects] = useState(false)
  const siteRef = useRef<HTMLElement>(null)
  const filters = ['All work', ...Array.from(new Set(projects.map((project) => project.category)))]
  const shownProjects = projects.filter((project) => filter === 'All work' || project.category === filter)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const site = siteRef.current
    if (!site) return
    let cancelled = false
    let cleanup = () => {}
    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([gsapModule, scrollTriggerModule]) => {
      if (cancelled || !siteRef.current) return
      const gsap = gsapModule.gsap
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)
      const context = gsap.context(() => {
      const hero = gsap.timeline({ defaults: { ease: 'power3.out' } })
      hero.fromTo('.reference-hero .hero-left > .eyebrow', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.65 })
        .fromTo('.reference-hero .reveal-hero-title', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.9 }, '-=0.3')
        .fromTo('.reference-hero .hero-build-statement, .reference-hero .hero-description, .reference-hero .hero-actions', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.12 }, '-=0.45')
        .fromTo('.reference-hero-art', { autoAlpha: 0, y: 24, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 1.1 }, '-=0.65')

      const targets = gsap.utils.toArray<HTMLElement>('.reference-tools, .reference-site > section:not(.reference-hero), .reference-site .work-card, .reference-site .experience-row, .reference-site .skill-card, .reference-site .post-card', site)
      targets.forEach((target) => {
        gsap.fromTo(target, { autoAlpha: 0, y: 30 }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: target, start: 'top 88%', once: true },
        })
      })

      gsap.to('.reference-hero-art', {
        yPercent: -5,
        ease: 'none',
        scrollTrigger: { trigger: '.reference-hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
      })
      }, site)
      cleanup = () => context.revert()
    })
    return () => {
      cancelled = true
      cleanup()
    }
  }, [])
  const priority = ['tablely', 'gym-os', 'instaly', 'shahzad-securities', 'personal-portfolio', 'attendance-system', 'offscrpt', 'orbit']
  const sortedProjects = [...shownProjects].sort((a, b) => { const ai = priority.indexOf(a.slug); const bi = priority.indexOf(b.slug); return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) })
  const featured = sortedProjects.slice(0, 3)
  const more = sortedProjects.slice(3, expandedProjects ? undefined : 7)
  const hiddenProjectCount = Math.max(0, sortedProjects.length - 7)
  return <div className={`portfolio-shell${theme === 'dark' ? ' theme-dark' : ''}`}><Header settings={settings} theme={theme} onThemeToggle={onThemeToggle}/><main className="reference-site" ref={siteRef}>
    <Hero settings={settings}/><TrustedTools/>
    <section className="work-section section-wrap reference-work" id="work"><div className="reference-work-heading"><div><Eyebrow>KRISH REVEALS / THE PROJECTS</Eyebrow><h2>Projects,<br/><span>revealed live.</span><i>〰</i></h2></div><div className="work-heading-right"><p>Made by Krish Sarkar.<br/>Shared as they come alive ↘</p><button className="btn btn-outline-light" type="button" onClick={() => setExpandedProjects(v => !v)}>{expandedProjects ? 'Show featured' : 'See all reveals'} <ArrowUpRight size={15}/></button></div></div>
      <div className="work-controls"><div className="work-filters">{filters.map((item) => <button key={item} className={filter === item ? 'filter-active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div><span className="work-count">{shownProjects.length.toString().padStart(2, '0')} PROJECTS <Asterisk size={12}/></span></div>
      <div className="work-grid reference-featured-grid">{featured.map((project, index) => <ProjectCard key={project.id} project={project} index={index}/>)}</div>
      {more.length > 0 && <div className="reference-more-projects"><span className="more-scribble">More<br/>projects ↗</span><div className="reference-mini-grid">{more.map((project) => <a key={project.id} className="mini-project" href={`/projects/${project.slug}`}><div className="mini-project-art"><ProjectArtwork project={project}/></div><div><small>{project.category} / {project.year}</small><b>{project.name}</b><span>{project.tagline || project.description}<ArrowRight size={14}/></span></div></a>)}</div>{hiddenProjectCount > 0 && !expandedProjects && <button className="more-projects-button" type="button" onClick={() => setExpandedProjects(true)}>+ {hiddenProjectCount} more project{hiddenProjectCount === 1 ? '' : 's'}</button>}{expandedProjects && hiddenProjectCount > 0 && <button className="more-projects-button" type="button" onClick={() => setExpandedProjects(false)}>Show featured selection</button>}</div>}
      <div className="work-footnote"><span>BUILT WITH CURIOSITY, ITERATION AND A LITTLE TOO MUCH COFFEE.</span><a href="#contact">HAVE SOMETHING IN MIND? <ArrowUpRight size={14}/></a></div>
    </section>
    <MarqueeSection projects={projects}/><AboutSection settings={settings}/><ServicesSection settings={settings}/><TimelineSection/><SkillsSection/><JournalSection posts={posts}/><ContactSection settings={settings}/>
  </main><Footer settings={settings}/></div>
}


function headingId(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
}

function articleHeadings(content: string) {
  return content.split(/\r?\n/).map((line) => {
    const match = line.match(/^(#{2,3})\s+(.+)$/)
    return match ? { level: match[1].length, text: match[2].trim(), id: headingId(match[2].trim()) } : null
  }).filter((item): item is { level: number; text: string; id: string } => Boolean(item))
}

function renderInlineMarkdown(text: string, prefix: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter((part) => part !== '')
  return parts.map((part, index) => {
    const key = `${prefix}-${index}`
    if (part.startsWith('`') && part.endsWith('`')) return <code className="article-inline-code" key={key}>{part.slice(1, -1)}</code>
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={key}>{part.slice(2, -2)}</strong>
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      const label = link[1]
      const href = link[2].trim()
      const safe = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href) && !/^javascript:/i.test(href)
      if (safe) return <a key={key} href={href} target={/^https?:\/\//i.test(href) ? '_blank' : undefined} rel={/^https?:\/\//i.test(href) ? 'noreferrer' : undefined}>{label}</a>
    }
    return part
  })
}

function highlightCode(code: string) {
  const tokenPattern = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|for|while|async|await|import|from|export|default|class|new|true|false|null|undefined|def|self|print|try|catch|throw|public|private|interface|type|extends|implements|select|where|insert|into|values|update|delete|create|table)\b|\b\d+(?:\.\d+)?\b)/g
  return code.split(tokenPattern).filter((part) => part !== '').map((part, index) => {
    let tokenClass = ''
    if (/^(\/\/|#|\/\*)/.test(part)) tokenClass = 'code-comment'
    else if (/^("|'|`)/.test(part)) tokenClass = 'code-string'
    else if (/^\d/.test(part)) tokenClass = 'code-number'
    else if (/^(const|let|var|function|return|if|else|for|while|async|await|import|from|export|default|class|new|true|false|null|undefined|def|self|print|try|catch|throw|public|private|interface|type|extends|implements|select|where|insert|into|values|update|delete|create|table)$/.test(part)) tokenClass = 'code-keyword'
    return tokenClass ? <span className={tokenClass} key={index}>{part}</span> : part
  })
}

function renderArticleContent(content: string) {
  const blocks = content.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean)
  return blocks.map((block, index) => {
    const code = block.match(/^```([a-zA-Z0-9_-]*)\n([\s\S]*?)\n```$/)
    if (code) return <pre className="article-code" key={index} data-language={code[1] || 'text'}><code>{highlightCode(code[2])}</code></pre>
    if (block.startsWith('## ')) { const text = block.slice(3); return <h2 id={headingId(text)} key={index}>{text}</h2> }
    if (block.startsWith('### ')) { const text = block.slice(4); return <h3 id={headingId(text)} key={index}>{text}</h3> }
    if (block.split('\n').every((line) => line.startsWith('- '))) return <ul key={index}>{block.split('\n').map((line, itemIndex) => <li key={itemIndex}>{renderInlineMarkdown(line.slice(2), `${index}-li-${itemIndex}`)}</li>)}</ul>
    if (block.startsWith('> ')) return <blockquote key={index}>{renderInlineMarkdown(block.split('\n').map((line) => line.replace(/^>\s?/, '')).join(' '), `${index}-quote`)}</blockquote>
    return <p key={index}>{renderInlineMarkdown(block.replace(/\n/g, ' '), `${index}-p`)}</p>
  })
}

function applySeo(title: string, description: string, pathname: string, image = '/og-card.png') {
  document.title = title
  const upsert = (kind: 'name' | 'property', key: string, value: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${kind}="${key}"]`)
    if (!element) { element = document.createElement('meta'); element.setAttribute(kind, key); document.head.appendChild(element) }
    element.content = value
  }
  const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, '')
  const canonical = `${siteUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`
  let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonicalLink) { canonicalLink = document.createElement('link'); canonicalLink.rel = 'canonical'; document.head.appendChild(canonicalLink) }
  canonicalLink.href = canonical
  upsert('name', 'description', description)
  upsert('property', 'og:title', title)
  upsert('property', 'og:description', description)
  upsert('property', 'og:url', canonical)
  upsert('property', 'og:type', pathname.startsWith('/blog/') ? 'article' : 'website')
  if (image) upsert('property', 'og:image', image.startsWith('http') ? image : `${siteUrl}${image.startsWith('/') ? image : `/${image}`}`)
  upsert('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
}

function ArticlePage({ post, settings, posts = [], theme, onThemeToggle }: { post: Post; settings: Settings; posts?: Post[]; theme: Theme; onThemeToggle: (origin: HTMLElement) => void }) {
  const [progress, setProgress] = useState(0)
  const headings = useMemo(() => articleHeadings(post.content || ''), [post.content])
  const orderedPosts = [...posts].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const currentIndex = orderedPosts.findIndex((item) => item.slug === post.slug)
  const previousPost = currentIndex >= 0 ? orderedPosts[currentIndex + 1] : undefined
  const nextPost = currentIndex > 0 ? orderedPosts[currentIndex - 1] : undefined

  useEffect(() => {
    applySeo(post.seoTitle || `${post.title} — Krish Reveals by ${settings.name}`, post.metaDescription || post.excerpt || `${post.title} by ${settings.name}`, `/blog/${post.slug}`, post.cover || '')
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0)
    }
    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [post.title, post.excerpt, post.seoTitle, post.metaDescription, post.cover, post.slug, settings.name])

  const [copied, setCopied] = useState(false)
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(window.location.href)}`
    }
  }

  return (
    <div className={`portfolio-shell${theme === 'dark' ? ' theme-dark' : ''}`}>
      <CustomCursor />
      <div className="reading-progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      <Header settings={settings} minimal theme={theme} onThemeToggle={onThemeToggle} />
      <main className="article-page section-wrap">
        <div className="article-breadcrumb"><a href="/blog"><ArrowLeft size={14}/> BACK TO JOURNAL</a><span>FIELD NOTE / {post.category.toUpperCase()}</span></div>
        <article className="article-layout">
          <header className="article-header">
            <div className="article-meta"><span>{post.category}</span><span><CalendarDays size={13}/>{formatDate(post.date)}</span><span><Clock3 size={13}/>{post.readTime}</span></div>
            <h1>{post.title}</h1>
            <p className="article-excerpt">{post.excerpt}</p>
            <div className="article-author"><span className="author-mark">k.</span><div><b>{post.author || settings.name}</b><span>Independent developer · Field notes</span></div><button className="share-button" onClick={copyLink}><Link2 size={14}/>{copied ? 'Copied' : 'Copy link'}</button></div>
          </header>
          <PostCover post={post} />
          <div className="article-content-layout">
            <aside className="article-aside"><span>IN THIS NOTE</span>{headings.length ? <nav className="article-toc" aria-label="Table of contents">{headings.map((heading) => <a key={heading.id} className={heading.level === 3 ? 'toc-subheading' : ''} href={`#${heading.id}`}>{heading.text}</a>)}</nav> : <div>Ideas, kept<br/>in context.</div>}<a href="/#contact">Have a related project? <ArrowUpRight size={14}/></a></aside>
            <div className="article-body">{renderArticleContent(post.content || post.excerpt)}<div className="article-end"><span className="brand-symbol">k<span>.</span></span><span>END OF NOTE · THANKS FOR READING</span></div><div className="article-tags">{(post.tags || []).map((tag) => <span key={tag}>#{tag}</span>)}</div><nav className="article-next-prev" aria-label="Article navigation">{previousPost ? <a href={`/blog/${previousPost.slug}`}><span><ArrowLeft size={13}/> PREVIOUS NOTE</span><b>{previousPost.title}</b></a> : <span/>}{nextPost ? <a href={`/blog/${nextPost.slug}`}><span>NEXT NOTE <ArrowRight size={13}/></span><b>{nextPost.title}</b></a> : <span/>}</nav></div>
          </div>
        </article>
      </main>
      <Footer settings={settings} />
    </div>
  )
}


function BlogPage({ posts, settings, theme, onThemeToggle }: { posts: Post[]; settings: Settings; theme: Theme; onThemeToggle: (origin: HTMLElement) => void }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All notes')
  const categories = ['All notes', ...Array.from(new Set(posts.map((post) => post.category))).sort()]
  const visible = useMemo(() => posts.filter((post) => (category === 'All notes' || post.category === category) && `${post.title} ${post.excerpt} ${post.category} ${(post.tags || []).join(' ')} ${post.content || ''}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => String(b.date).localeCompare(String(a.date))), [posts, category, search])
  useEffect(() => { applySeo(`Krish Reveals — Journal — ${settings.name}`, 'Field notes from Krish Sarkar on building digital products and sharing the process.', '/blog') }, [settings.name])
  return <div className={`portfolio-shell${theme === 'dark' ? ' theme-dark' : ''}`}><Header settings={settings} minimal theme={theme} onThemeToggle={onThemeToggle}/><main className="blog-index-page section-wrap"><div className="blog-index-hero"><Eyebrow>KRISH REVEALS / FIELD NOTES</Eyebrow><h1>Building in<br/><em>the open.</em></h1><p>Notes from Krish Sarkar on turning ideas into digital products and sharing the process as it happens.</p><div className="blog-index-metadata"><span>{posts.length.toString().padStart(2, '0')} PUBLISHED NOTES</span><span>DESIGN · ENGINEERING · PRODUCT</span></div></div><div className="blog-index-controls"><div className="journal-filters">{categories.map((item) => <button key={item} className={category === item ? 'filter-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="journal-search"><Search size={15}/><input aria-label="Search all journal articles" placeholder="Search title, topic, or content" value={search} onChange={(event) => setSearch(event.target.value)}/>{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={13}/></button>}</label></div>{visible.length ? <div className="blog-index-grid">{visible.map((post, index) => <PostCard key={post.id} post={post} index={index}/>)}</div> : <div className="empty-state"><BookOpen size={20}/><p>No articles match these filters.</p><button className="text-link" onClick={() => { setSearch(''); setCategory('All notes') }}>Clear search and filters <ArrowRight size={14}/></button></div>}<div className="blog-index-bottom"><a href="/#contact" className="btn btn-dark">Reveal a project <ArrowUpRight size={15}/></a><a href="/">Back to Krish Reveals <ArrowRight size={14}/></a></div></main><Footer settings={settings}/></div>
}

function ProjectPage({ project, projects, settings, theme, onThemeToggle }: { project: Project; projects: Project[]; settings: Settings; theme: Theme; onThemeToggle: (origin: HTMLElement) => void }) {
  const related = projects.filter((item) => item.slug !== project.slug).slice(0, 3)
  useEffect(() => { applySeo(`${project.name} — Revealed by ${settings.name} | Krish Reveals`, project.description, `/projects/${project.slug}`, project.cover || '') }, [project.name, project.description, project.slug, project.cover, settings.name])
  const projectStatus = project.status || 'In progress'

  return (
    <div className={`portfolio-shell${theme === 'dark' ? ' theme-dark' : ''}`}>
      <Header settings={settings} minimal theme={theme} onThemeToggle={onThemeToggle} />
      <main className="case-study-page section-wrap">
        <div className="case-study-breadcrumb"><a href="/#work"><ArrowLeft size={14}/> ALL PROJECT REVEALS</a><span>KRISH REVEALS / {project.number}</span></div>
        <header className="case-study-hero">
          <div className="case-study-heading">
            <div className="case-study-eyebrow"><Eyebrow>{project.category} · {project.year}</Eyebrow><span className={`case-status status-${projectStatus.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{projectStatus}</span></div>
            <h1>{project.name}</h1>
            <p>{project.description}</p>
            <div className="case-study-actions">{project.liveUrl && <a className="btn btn-dark" href={project.liveUrl} target="_blank" rel="noreferrer">Live project <ExternalLink size={14}/></a>}{project.sourceUrl && <a className="btn btn-light" href={project.sourceUrl} target="_blank" rel="noreferrer">Source code <Github size={14}/></a>}<a className="btn btn-light" href="/#contact">Discuss a project <ArrowUpRight size={14}/></a></div>
          </div>
          <div className="case-study-art"><ProjectArtwork project={project} large /></div>
        </header>

        <section className="case-study-overview">
          <div><Eyebrow>OVERVIEW</Eyebrow><span>PROJECT / {project.number}</span></div>
          <p>{project.description}</p>
          <div className="case-study-facts">
            <div><span>ROLE</span><b>{project.role || 'Product development'}</b></div>
            <div><span>STATUS</span><b>{projectStatus}</b></div>
            <div><span>YEAR</span><b>{project.year}</b></div>
          </div>
        </section>

        <section className="case-study-sections">
          <article><span>01 / THE PROBLEM</span><h2>What needed to change</h2><p>{project.challenge || 'The project is exploring a real user need. The problem statement should be refined as the product is validated.'}</p></article>
          <article><span>02 / THE APPROACH</span><h2>How it comes together</h2><p>{project.approach || 'The implementation is being shaped around clear information, purposeful interactions, accessibility, and a responsive foundation.'}</p></article>
          <article><span>03 / CURRENT OUTCOME</span><h2>What it’s doing now</h2><p>{project.outcome || 'The product continues to evolve by testing assumptions, refining flows, and making the experience easier to use.'}</p></article>
        </section>

        <div className="case-study-tech">
          <div><Eyebrow>IMPLEMENTATION</Eyebrow><h2>Built with <em>the right tools</em> for the job.</h2><p>{project.description}</p><div className="tag-list">{(project.stack || []).slice(0, 8).map((tech) => <i key={tech}>{tech}</i>)}</div></div>
          <div className="case-study-detail-note"><span>WHAT MAKES IT USEFUL</span><b>{project.tagline || 'A focused product built to be useful, clean, and easy to trust.'}</b><p>{project.outcome || 'The goal is to make a digital product clearer, calmer, and easier to understand at a glance.'}</p></div>
        </div>

        {related.length > 0 && <div className="related-projects"><div className="related-projects-heading"><div><Eyebrow>MORE WORK</Eyebrow><h2>Other <span>signals.</span></h2></div><a href="/#work">Explore all work <ArrowRight size={14}/></a></div><div className="related-projects-grid">{related.map((item) => <a key={item.id} className="related-project-card" href={`/projects/${item.slug}`}><div><ProjectArtwork project={item} /></div><span>{item.category} / {item.year}</span><b>{item.name}</b><p>{item.tagline || item.description}</p><ArrowUpRight size={16}/></a>)}</div></div>}

        {settings.email && <div className="case-study-cta"><Eyebrow>HAVE A SIMILAR IDEA?</Eyebrow><h2>Let’s build <em>something.</em></h2><a className="btn btn-dark" href="/#contact">Start the conversation <ArrowUpRight size={15}/></a></div>}
      </main>
      <Footer settings={settings} />
    </div>
  )
}


function PublicApp() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return window.localStorage.getItem('portfolio-theme') === 'dark' ? 'dark' : 'light' }
    catch { return 'light' }
  })
  const [settings, setSettings] = useState<Settings>(fallbackSettings)
  const [projects, setProjects] = useState<Project[]>(fallbackProjects as Project[])
  const [posts, setPosts] = useState<Post[]>(fallbackPosts as Post[])
  const [loading, setLoading] = useState(true)
  const [apiOnline, setApiOnline] = useState(false)
  useEffect(() => {
    let alive = true
    api<{ settings: Settings; projects: Project[]; posts: Post[] }>('/api/public/data').then((data) => { if (!alive) return; setSettings({ ...fallbackSettings, ...data.settings, services: data.settings.services || fallbackSettings.services }); setProjects(data.projects); setPosts(data.posts); setApiOnline(true) }).catch(() => setApiOnline(false)).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])
  useEffect(() => { document.documentElement.style.setProperty('--site-accent', settings.accent || '#a7e8d1') }, [settings.accent])
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }, [theme])
  useEffect(() => { if (window.location.pathname === '/') applySeo(settings.seoTitle || `Krish Reveals — ${settings.name}`, settings.seoDescription || 'Krish Reveals: Krish Sarkar builds digital products and shares their journey from first idea to live reveal.', '/') }, [settings.name, settings.seoTitle, settings.seoDescription])
  useEffect(() => { try { window.localStorage.setItem('portfolio-theme', theme) } catch { /* storage is optional */ } }, [theme])
  const toggleTheme = (origin: HTMLElement) => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    const bounds = origin.getBoundingClientRect()
    document.documentElement.style.setProperty('--theme-origin-x', `${bounds.left + bounds.width / 2}px`)
    document.documentElement.style.setProperty('--theme-origin-y', `${bounds.top + bounds.height / 2}px`)
    const transitionDocument = document as Document & { startViewTransition?: (update: () => void) => unknown }
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && transitionDocument.startViewTransition) transitionDocument.startViewTransition(() => setTheme(nextTheme))
    else setTheme(nextTheme)
  }
  const path = decodeURIComponent(window.location.pathname).replace(/\/$/, '') || '/'
  const projectMatch = path.match(/^\/projects\/([^/]+)$/)
  if (projectMatch) {
    const project = projects.find((item) => item.slug === projectMatch[1])
    if (loading && !project) return <div className="route-loading"><Brand/><span>Opening the case study…</span></div>
    if (project) return <ProjectPage project={project} projects={projects} settings={settings} theme={theme} onThemeToggle={toggleTheme}/>
    return <div className={`portfolio-shell${theme === 'dark' ? ' theme-dark' : ''}`}><Header settings={settings} minimal theme={theme} onThemeToggle={toggleTheme}/><main className="not-found section-wrap"><span>404 / PROJECT NOT FOUND</span><h1>This project<br/><em>isn’t here yet.</em></h1><p>The project may be unpublished, archived, or the URL may be incorrect.</p><a className="btn btn-dark" href="/#work">Back to selected work <ArrowLeft size={15}/></a></main><Footer settings={settings}/></div>
  }
  if (path === '/blog') return <BlogPage posts={posts} settings={settings} theme={theme} onThemeToggle={toggleTheme}/>
  if (path.startsWith('/blog/') || path.startsWith('/journal/')) {
    const slug = path.startsWith('/blog/') ? path.slice('/blog/'.length) : path.slice('/journal/'.length)
    const post = posts.find((item) => item.slug === slug)
    if (loading && !post) return <div className="route-loading"><Brand/><span>Opening the article…</span></div>
    if (post) return <ArticlePage post={post} settings={settings} posts={posts} theme={theme} onThemeToggle={toggleTheme}/>
    return <div className={`portfolio-shell${theme === 'dark' ? ' theme-dark' : ''}`}><Header settings={settings} minimal theme={theme} onThemeToggle={toggleTheme}/><main className="not-found section-wrap"><span>404 / ARTICLE NOT FOUND</span><h1>This page took<br/><em>a side quest.</em></h1><p>The article may have moved, is still a draft, or no longer exists.</p><a className="btn btn-dark" href="/blog">Back to the journal <ArrowLeft size={15}/></a></main><Footer settings={settings}/></div>
  }
  return <><Portfolio settings={settings} projects={projects} posts={posts} theme={theme} onThemeToggle={toggleTheme}/>{!apiOnline && !loading && <div className="api-dev-note" role="status">Preview mode: start the API with <code>npm run dev</code> to enable publishing and contact submissions.</div>}</>
}

// ------------------------------- ADMIN CMS -------------------------------
const emptyPost = (): Partial<Post> => ({ title: '', slug: '', excerpt: '', seoTitle: '', metaDescription: '', category: 'Building', date: new Date().toISOString().slice(0, 10), readTime: '4 min read', cover: '', accent: '#d9f4e9', status: 'draft', tags: [], author: 'Krish Sarkar', content: '' })
const emptyProject = (): Partial<Project> => ({ name: '', slug: '', tagline: '', description: '', category: 'SaaS', year: String(new Date().getFullYear()), role: 'Product engineering', stack: [], status: 'In progress', accent: '#d9f4e9', published: false, featured: false, challenge: '', approach: '', outcome: '', liveUrl: '', sourceUrl: '' })

function AdminApp() {
  const [authState, setAuthState] = useState<'checking' | 'signed-out' | 'signed-in'>('checking')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeView, setActiveView] = useState<ViewName>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [messages, setMessages] = useState<Inquiry[]>([])
  const [settings, setSettings] = useState<Settings>(fallbackSettings)
  const [servicesDraft, setServicesDraft] = useState(JSON.stringify(fallbackSettings.services, null, 2))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null)
  const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<Inquiry | null>(null)
  const [postSearch, setPostSearch] = useState('')
  const [projectSearch, setProjectSearch] = useState('')

  const loadAll = useCallback(async () => {
    setError('')
    try {
      const [nextStats, nextPosts, nextProjects, nextMessages, nextSettings] = await Promise.all([
        api<Stats>('/api/admin/dashboard'), api<Post[]>('/api/admin/posts'), api<Project[]>('/api/admin/projects'), api<Inquiry[]>('/api/admin/messages'), api<Settings>('/api/admin/settings'),
      ])
      setStats(nextStats); setPosts(nextPosts); setProjects(nextProjects); setMessages(nextMessages); setSettings({ ...fallbackSettings, ...nextSettings, services: nextSettings.services || fallbackSettings.services }); setServicesDraft(JSON.stringify(nextSettings.services || fallbackSettings.services, null, 2))
    } catch (e) { const message = e instanceof Error ? e.message : 'Could not load admin data.'; if (message.includes('sign in') || message.includes('Not signed')) setAuthState('signed-out'); else setError(message) }
  }, [])

  useEffect(() => { api<{ email: string }>('/api/admin/me').then(() => { setAuthState('signed-in'); return loadAll() }).catch(() => setAuthState('signed-out')) }, [loadAll])
  useEffect(() => { document.title = authState === 'signed-in' ? 'Studio admin — Krish Sarkar' : 'Admin sign in — Krish Sarkar' }, [authState])

  const signIn = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setLoginError('')
    try { await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }); setPassword(''); setAuthState('signed-in'); await loadAll() }
    catch (e) { setLoginError(e instanceof Error ? e.message : 'Could not sign in.') }
    finally { setBusy(false) }
  }
  const signOut = async () => { try { await api('/api/admin/logout', { method: 'POST', body: '{}' }) } catch { /* local session state still clears */ } setAuthState('signed-out'); setActiveView('overview') }
  const flash = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(''), 2600) }

  const savePost = async (event: FormEvent) => {
    event.preventDefault(); if (!editingPost) return; setBusy(true); setError('')
    try {
      const payload = { ...editingPost, slug: editingPost.slug || editingPost.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), tags: Array.isArray(editingPost.tags) ? editingPost.tags : [] }
      const saved = editingPost.id ? await api<Post>(`/api/admin/posts/${editingPost.id}`, { method: 'PUT', body: JSON.stringify(payload) }) : await api<Post>('/api/admin/posts', { method: 'POST', body: JSON.stringify(payload) })
      setPosts((items) => [saved, ...items.filter((item) => item.id !== saved.id)]); setEditingPost(null); flash(saved.status === 'published' ? 'Article saved and published.' : 'Draft saved.'); await loadAll()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save article.') } finally { setBusy(false) }
  }
  const saveProject = async (event: FormEvent) => {
    event.preventDefault(); if (!editingProject) return; setBusy(true); setError('')
    try {
      const payload = { ...editingProject, slug: editingProject.slug || editingProject.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), stack: Array.isArray(editingProject.stack) ? editingProject.stack : [] }
      const saved = editingProject.id ? await api<Project>(`/api/admin/projects/${editingProject.id}`, { method: 'PUT', body: JSON.stringify(payload) }) : await api<Project>('/api/admin/projects', { method: 'POST', body: JSON.stringify(payload) })
      setProjects((items) => [saved, ...items.filter((item) => item.id !== saved.id)]); setEditingProject(null); flash('Project saved.'); await loadAll()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save project.') } finally { setBusy(false) }
  }
  const deleteRecord = async (type: 'posts' | 'projects', id: string) => {
    const label = type === 'posts' ? 'article' : 'project'
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return
    try { await api(`/api/admin/${type}/${id}`, { method: 'DELETE' }); if (type === 'posts') setPosts((items) => items.filter((item) => item.id !== id)); else setProjects((items) => items.filter((item) => item.id !== id)); flash(`${label[0].toUpperCase()}${label.slice(1)} deleted.`); await loadAll() }
    catch (e) { setError(e instanceof Error ? e.message : `Could not delete ${label}.`) }
  }
  const updateMessageRead = async (message: Inquiry, read: boolean) => {
    try { const result = await api<Inquiry>(`/api/admin/messages/${message.id}`, { method: 'PUT', body: JSON.stringify({ read }) }); setMessages((items) => items.map((item) => item.id === result.id ? result : item)); if (selectedMessage?.id === result.id) setSelectedMessage(result); await loadAll() }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update inquiry.') }
  }
  const deleteMessage = async (message: Inquiry) => {
    if (!window.confirm('Delete this inquiry?')) return
    try { await api(`/api/admin/messages/${message.id}`, { method: 'DELETE' }); setMessages((items) => items.filter((item) => item.id !== message.id)); setSelectedMessage(null); flash('Inquiry deleted.'); await loadAll() }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not delete inquiry.') }
  }
  const uploadImage = async (file: File, setUrl: (url: string) => void) => {
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { setError('Choose a PNG, JPG, WEBP, or GIF image.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return }
    setBusy(true); setError('')
    try { const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read image.')); reader.onerror = () => reject(new Error('Could not read image.')); reader.readAsDataURL(file) }); const result = await api<{ url: string }>('/api/admin/upload', { method: 'POST', body: JSON.stringify({ filename: file.name, dataUrl }) }); setUrl(result.url); flash('Image uploaded.') }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not upload image.') } finally { setBusy(false) }
  }
  const saveSettings = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      let services: Settings['services']
      try { services = JSON.parse(servicesDraft) as Settings['services'] } catch { throw new Error('Services must be valid JSON. Check commas, quotes, and brackets.') }
      if (!Array.isArray(services) || services.length < 1 || services.length > 5 || services.some((service) => !service.title?.trim() || !service.description?.trim())) throw new Error('Provide 1–5 services, each with a title and description.')
      const saved = await api<Settings>('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ ...settings, services }) }); setSettings((prev) => ({ ...prev, ...saved })); setServicesDraft(JSON.stringify(saved.services || services, null, 2)); flash('Site settings saved.'); await loadAll()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save settings.') } finally { setBusy(false) }
  }

  if (authState === 'checking') return <div className="admin-loading"><Brand/><LoaderCircle className="spin" size={22}/><span>Checking your studio…</span></div>
  if (authState === 'signed-out') return <div className="admin-login-shell"><a href="/" className="admin-login-back"><ArrowLeft size={15}/> Back to portfolio</a><div className="admin-login-card"><Brand/><div className="admin-login-icon"><LockKeyhole size={23}/></div><Eyebrow>PRIVATE STUDIO</Eyebrow><h1>Welcome<br/>back, Krish.</h1><p>Sign in to manage your projects, journal, and incoming inquiries.</p><form onSubmit={signIn}><label><span>Email</span><input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/></label><label><span>Password</span><div className="password-input"><input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your admin password"/><button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>{loginError && <p className="login-error" role="alert">{loginError}</p>}<button className="btn btn-dark login-submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin"/> : <LockKeyhole size={15}/>} Sign in to studio <ArrowUpRight size={15}/></button></form><small>Access is private. Admin credentials are created from the project terminal.</small></div><span className="login-copyright">KRISH SARKAR / CONTENT STUDIO</span></div>

  const navItems: Array<{ id: ViewName; label: string; icon: typeof LayoutDashboard; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard }, { id: 'posts', label: 'Journal', icon: FileText, count: posts.length }, { id: 'projects', label: 'Projects', icon: FolderKanban, count: projects.length }, { id: 'inquiries', label: 'Inquiries', icon: Inbox, count: stats?.counts.unread || 0 }, { id: 'settings', label: 'Site settings', icon: Settings2 },
  ]
  const viewTitle: Record<ViewName, string> = { overview: 'The studio, at a glance.', posts: 'Your journal.', projects: 'Your selected work.', inquiries: 'Notes from the outside.', settings: 'Make it yours.' }
  const matchingPosts = posts.filter((p) => `${p.title} ${p.category} ${p.status}`.toLowerCase().includes(postSearch.toLowerCase()))
  const matchingProjects = projects.filter((p) => `${p.name} ${p.category} ${p.status}`.toLowerCase().includes(projectSearch.toLowerCase()))

  return <div className="admin-shell"><aside className="admin-sidebar"><a href="/" className="admin-logo"><Brand/><span className="admin-logo-label">CONTENT STUDIO</span></a><div className="admin-workspace"><span className="workspace-avatar">k.</span><div><b>Krish’s studio</b><span>Personal portfolio</span></div><ChevronDown size={14}/></div><div className="admin-nav-label">WORKSPACE</div><nav className="admin-nav">{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} aria-label={item.label} className={activeView === item.id ? 'admin-nav-active' : ''} onClick={() => { setActiveView(item.id); setEditingPost(null); setEditingProject(null); setSelectedMessage(null); setError('') }}><Icon size={17}/><span>{item.label}</span>{item.count !== undefined && <small>{item.count.toString().padStart(2, '0')}</small>}</button> })}</nav><div className="admin-sidebar-bottom"><a href="/" target="_blank" rel="noreferrer"><Globe size={15}/> View live site <ArrowUpRight size={13}/></a><button onClick={signOut}><LogOut size={15}/> Sign out</button><div className="admin-user"><span className="admin-user-avatar">{(stats?.email || 'K').slice(0, 1).toUpperCase()}</span><div><b>{stats?.email || 'Admin'}</b><span>Administrator</span></div><span className="user-status"/></div></div></aside><main className="admin-main"><header className="admin-topbar"><div><span>KRISH / STUDIO</span><b>{navItems.find((n) => n.id === activeView)?.label || 'Overview'}</b></div><div className="admin-topbar-actions"><span className="admin-live"><i/> API connected</span><a href="/" target="_blank" rel="noreferrer" className="admin-view-site">View site <ExternalLink size={13}/></a></div></header><div className="admin-content"><div className="admin-page-heading"><div><Eyebrow>YOUR SPACE / CONTROL ROOM</Eyebrow><h1>{editingPost ? (editingPost.id ? 'Edit article.' : 'Write a new note.') : editingProject ? (editingProject.id ? 'Edit project.' : 'Add a project.') : selectedMessage ? 'Read inquiry.' : viewTitle[activeView]}</h1><p>{editingPost ? 'A good note starts with a clear idea.' : editingProject ? 'Keep the story honest and the details useful.' : selectedMessage ? 'A conversation, with context.' : activeView === 'overview' ? 'Everything in one place. No spreadsheets required.' : activeView === 'posts' ? 'Write, edit, publish, or keep a draft for later.' : activeView === 'projects' ? 'Show the work, explain the thinking, label the status.' : activeView === 'inquiries' ? 'Messages submitted through your portfolio contact form.' : 'Update the details people see on the public site.'}</p></div>{!editingPost && !editingProject && !selectedMessage && <div className="admin-heading-actions">{activeView === 'posts' && <button className="btn btn-dark" onClick={() => setEditingPost(emptyPost())}><Plus size={15}/> New article</button>}{activeView === 'projects' && <button className="btn btn-dark" onClick={() => setEditingProject(emptyProject())}><Plus size={15}/> New project</button>}{activeView === 'overview' && <a className="btn btn-dark" href="/#contact" target="_blank" rel="noreferrer">Preview site <ArrowUpRight size={15}/></a>}</div>}</div>{error && <div className="admin-alert admin-alert-error"><CircleHelp size={16}/>{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={15}/></button></div>}{notice && <div className="admin-alert admin-alert-success"><Check size={16}/>{notice}</div>}
      {activeView === 'overview' && !editingPost && !editingProject && !selectedMessage && <div className="admin-overview"><div className="admin-stat-grid"><div className="admin-stat-card"><span><FileText size={17}/> JOURNAL</span><b>{stats?.counts.posts ?? posts.length}</b><small>{stats?.counts.publishedPosts ?? posts.filter((p) => p.status === 'published').length} published · rest in draft</small><div className="stat-spark stat-mint">↗</div></div><div className="admin-stat-card"><span><FolderKanban size={17}/> PROJECTS</span><b>{stats?.counts.projects ?? projects.length}</b><small>{stats?.counts.publishedProjects ?? projects.filter((p) => p.published).length} visible on the site</small><div className="stat-spark stat-lilac">✳</div></div><div className="admin-stat-card"><span><Inbox size={17}/> INQUIRIES</span><b>{stats?.counts.inquiries ?? messages.length}</b><small>{stats?.counts.unread ?? messages.filter((m) => !m.readAt).length} need a look</small><div className="stat-spark stat-peach">↘</div></div></div><div className="admin-overview-grid"><section className="admin-panel admin-quick-panel"><div className="admin-panel-head"><div><span>QUICK ACCESS</span><h2>What are we doing today?</h2></div><Asterisk size={22}/></div><button className="quick-action" onClick={() => { setActiveView('posts'); setEditingPost(emptyPost()) }}><span className="quick-icon quick-mint"><Pencil size={17}/></span><span><b>Write a new journal note</b><small>Draft ideas before they go live.</small></span><ArrowUpRight size={16}/></button><button className="quick-action" onClick={() => { setActiveView('projects'); setEditingProject(emptyProject()) }}><span className="quick-icon quick-lilac"><Plus size={17}/></span><span><b>Add a project to the portfolio</b><small>Share a build and explain the thinking.</small></span><ArrowUpRight size={16}/></button><button className="quick-action" onClick={() => setActiveView('inquiries')}><span className="quick-icon quick-peach"><MessageSquare size={17}/></span><span><b>Review incoming inquiries</b><small>Reply while the context is fresh.</small></span><ArrowUpRight size={16}/></button><button className="quick-action" onClick={() => setActiveView('settings')}><span className="quick-icon quick-blue"><Settings2 size={17}/></span><span><b>Update public profile details</b><small>Headline, contact, and social links.</small></span><ArrowUpRight size={16}/></button></section><section className="admin-panel admin-recent-panel"><div className="admin-panel-head"><div><span>RECENT JOURNAL</span><h2>Last edited in public</h2></div><button className="icon-btn" onClick={() => setActiveView('posts')} aria-label="Go to journal"><ArrowUpRight size={16}/></button></div>{posts.slice(0, 5).map((post) => <button className="recent-post-row" key={post.id} onClick={() => { setActiveView('posts'); setEditingPost({ ...post }) }}><span className="recent-post-accent" style={{ background: post.accent }}/><span><b>{post.title}</b><small>{formatDate(post.date)} · {post.category}</small></span><span className={`status-chip ${post.status === 'published' ? 'status-published' : 'status-draft'}`}>{post.status}</span><Pencil size={13}/></button>)}{posts.length === 0 && <p className="admin-empty">No articles yet. Create the first one.</p>}</section></div><div className="admin-bottom-strip"><span><Sparkles size={15}/> A small reminder</span><p>Make the portfolio easy to trust: real work, honest status, useful writing, and a clear way to contact you.</p><a href="/#work" target="_blank" rel="noreferrer">See public work <ArrowUpRight size={13}/></a></div></div>}

      {activeView === 'posts' && !selectedMessage && (editingPost ? <form className="editor-layout" onSubmit={savePost}><section className="admin-panel editor-main"><div className="editor-toolbar"><span><FileText size={15}/> JOURNAL / EDITOR</span><button type="button" className="text-link" onClick={() => setEditingPost(null)}><X size={14}/> Cancel</button></div><label className="editor-title-field"><span>ARTICLE TITLE</span><input required value={editingPost.title || ''} onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value, slug: editingPost.id ? editingPost.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} placeholder="A clear, specific title" maxLength={180}/></label><label><span>SLUG</span><input required value={editingPost.slug || ''} onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })} placeholder="short-readable-url" maxLength={120}/></label><label><span>SHORT INTRO / EXCERPT</span><textarea rows={3} value={editingPost.excerpt || ''} onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })} placeholder="What is this note about?" maxLength={420}/></label><div className="editor-seo-fields"><label><span>SEO TITLE <small>OPTIONAL</small></span><input value={editingPost.seoTitle || ''} onChange={(e) => setEditingPost({ ...editingPost, seoTitle: e.target.value })} placeholder="Defaults to the article title" maxLength={180}/></label><label><span>META DESCRIPTION <small>OPTIONAL</small></span><textarea rows={3} value={editingPost.metaDescription || ''} onChange={(e) => setEditingPost({ ...editingPost, metaDescription: e.target.value })} placeholder="A concise search and social summary" maxLength={420}/></label></div><label className="content-editor"><span>ARTICLE CONTENT <small>MARKDOWN-INSPIRED · SEPARATE BLOCKS WITH A BLANK LINE</small></span><textarea rows={18} value={editingPost.content || ''} onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })} placeholder={'Open with the main idea…\n\n## A useful section heading\n\nWrite the supporting detail here.\n\n- A short list item\n- Another useful detail'} required/></label><div className="editor-hint"><CircleHelp size={15}/><span>Supports paragraphs, headings (`##` / `###`), simple lists (`- `), and blockquotes (`&gt; `).</span></div></section><aside className="editor-side"><section className="admin-panel editor-publish-panel"><div className="admin-panel-head"><div><span>PUBLISHING</span><h2>One last look.</h2></div><CalendarDays size={18}/></div><label><span>STATUS</span><select value={editingPost.status || 'draft'} onChange={(e) => setEditingPost({ ...editingPost, status: e.target.value as 'draft' | 'published' })}><option value="draft">Draft / private</option><option value="published">Published / public</option></select></label><label><span>PUBLICATION DATE</span><input type="date" value={editingPost.date || ''} onChange={(e) => setEditingPost({ ...editingPost, date: e.target.value })}/></label><label><span>CATEGORY</span><input value={editingPost.category || ''} onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value })} placeholder="Design, Building…" maxLength={60}/></label><label><span>READ TIME</span><input value={editingPost.readTime || ''} onChange={(e) => setEditingPost({ ...editingPost, readTime: e.target.value })} placeholder="5 min read" maxLength={24}/></label><label><span>TAGS <small>COMMA SEPARATED</small></span><input value={(editingPost.tags || []).join(', ')} onChange={(e) => setEditingPost({ ...editingPost, tags: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} placeholder="design, frontend"/></label><button className="btn btn-dark editor-save" type="submit" disabled={busy}><Save size={15}/>{busy ? 'Saving…' : 'Save article'} <ArrowUpRight size={14}/></button></section><section className="admin-panel editor-cover-panel"><div className="admin-panel-head"><div><span>FEATURE IMAGE</span><h2>Cover art</h2></div><Upload size={17}/></div><label><span>IMAGE URL OR UPLOAD PATH</span><input value={editingPost.cover || ''} onChange={(e) => setEditingPost({ ...editingPost, cover: e.target.value })} placeholder="/uploads/cover.webp"/></label>{editingPost.cover && <img className="cover-upload-preview" src={editingPost.cover} alt="Cover preview"/>}<label className="upload-drop"><Upload size={18}/><span>Upload image from device</span><small>PNG, JPG, WEBP or GIF · max 5 MB</small><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadImage(file, (url) => setEditingPost((p) => p ? { ...p, cover: url } : p)); e.currentTarget.value = '' }}/></label><label><span>ART ACCENT</span><div className="color-picker-row"><input type="color" value={editingPost.accent || '#d9f4e9'} onChange={(e) => setEditingPost({ ...editingPost, accent: e.target.value })}/><code>{editingPost.accent || '#d9f4e9'}</code></div></label></section></aside></form> : <section className="admin-panel list-panel"><div className="list-panel-toolbar"><div><span>CONTENT LIBRARY</span><h2>{posts.length} articles <span>· {posts.filter((p) => p.status === 'published').length} live</span></h2></div><label className="admin-search"><Search size={15}/><input value={postSearch} onChange={(e) => setPostSearch(e.target.value)} placeholder="Search articles"/></label></div><div className="admin-table-head"><span>ARTICLE</span><span>CATEGORY</span><span>UPDATED</span><span>STATUS</span><span>ACTIONS</span></div>{matchingPosts.map((post) => <div className="admin-table-row" key={post.id}><div className="table-record-main"><span className="record-cover" style={{ background: post.accent }}>{post.cover ? <img src={post.cover} alt=""/> : <Asterisk size={18}/>}</span><span><b>{post.title}</b><small>/journal/{post.slug}</small></span></div><span className="table-secondary">{post.category}</span><span className="table-secondary">{formatDate(post.date)}</span><span><i className={`status-chip ${post.status === 'published' ? 'status-published' : 'status-draft'}`}>{post.status}</i></span><div className="table-actions"><button className="icon-btn" aria-label={`Edit ${post.title}`} onClick={() => setEditingPost({ ...post })}><Pencil size={15}/></button><a className="icon-btn" aria-label={`Preview ${post.title}`} href={`/journal/${post.slug}`} target="_blank" rel="noreferrer"><Eye size={15}/></a><button className="icon-btn icon-danger" aria-label={`Delete ${post.title}`} onClick={() => void deleteRecord('posts', post.id)}><Trash2 size={15}/></button></div></div>)}{matchingPosts.length === 0 && <div className="admin-empty"><FileText size={20}/><p>No articles match this search.</p><button className="text-link" onClick={() => { setPostSearch(''); setEditingPost(emptyPost()) }}>Write a note <ArrowRight size={14}/></button></div>}</section>)}

      {activeView === 'projects' && !selectedMessage && (editingProject ? <form className="editor-layout" onSubmit={saveProject}><section className="admin-panel editor-main"><div className="editor-toolbar"><span><FolderKanban size={15}/> PORTFOLIO / PROJECT EDITOR</span><button type="button" className="text-link" onClick={() => setEditingProject(null)}><X size={14}/> Cancel</button></div><label className="editor-title-field"><span>PROJECT NAME</span><input required value={editingProject.name || ''} onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value, slug: editingProject.id ? editingProject.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} placeholder="Project name" maxLength={100}/></label><label><span>SLUG</span><input required value={editingProject.slug || ''} onChange={(e) => setEditingProject({ ...editingProject, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })} maxLength={120}/></label><label><span>TAGLINE</span><input value={editingProject.tagline || ''} onChange={(e) => setEditingProject({ ...editingProject, tagline: e.target.value })} placeholder="A short phrase that gives it personality" maxLength={180}/></label><label><span>PROJECT DESCRIPTION</span><textarea rows={4} value={editingProject.description || ''} onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })} placeholder="What is it, and why does it exist?" maxLength={1200}/></label><div className="editor-two-col"><label><span>CHALLENGE</span><textarea rows={5} value={editingProject.challenge || ''} onChange={(e) => setEditingProject({ ...editingProject, challenge: e.target.value })} placeholder="What needed to change?" maxLength={2000}/></label><label><span>APPROACH</span><textarea rows={5} value={editingProject.approach || ''} onChange={(e) => setEditingProject({ ...editingProject, approach: e.target.value })} placeholder="How did you approach it?" maxLength={2000}/></label></div><label><span>OUTCOME / CURRENT STATUS DETAILS</span><textarea rows={4} value={editingProject.outcome || ''} onChange={(e) => setEditingProject({ ...editingProject, outcome: e.target.value })} placeholder="Be factual. What exists today?" maxLength={2000}/></label></section><aside className="editor-side"><section className="admin-panel editor-publish-panel"><div className="admin-panel-head"><div><span>PROJECT DETAILS</span><h2>Make it discoverable.</h2></div><Layers3 size={18}/></div><label><span>CATEGORY</span><select value={editingProject.category || 'SaaS'} onChange={(e) => setEditingProject({ ...editingProject, category: e.target.value })}>{['SaaS', 'Commerce', 'AI', 'Editorial', 'Website', 'Other'].map((x) => <option key={x}>{x}</option>)}</select></label><label><span>YEAR</span><input value={editingProject.year || ''} onChange={(e) => setEditingProject({ ...editingProject, year: e.target.value })} maxLength={8}/></label><label><span>ROLE</span><input value={editingProject.role || ''} onChange={(e) => setEditingProject({ ...editingProject, role: e.target.value })} maxLength={160}/></label><label><span>LIVE PROJECT URL <small>OPTIONAL · HTTP(S) ONLY</small></span><input type="url" value={editingProject.liveUrl || ''} onChange={(e) => setEditingProject({ ...editingProject, liveUrl: e.target.value })} placeholder="https://…"/></label><label><span>SOURCE CODE URL <small>OPTIONAL</small></span><input type="url" value={editingProject.sourceUrl || ''} onChange={(e) => setEditingProject({ ...editingProject, sourceUrl: e.target.value })} placeholder="https://github.com/…"/></label><label><span>TECH STACK <small>COMMA SEPARATED</small></span><input value={(editingProject.stack || []).join(', ')} onChange={(e) => setEditingProject({ ...editingProject, stack: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} placeholder="React, TypeScript"/></label><label><span>STATUS</span><select value={editingProject.status || 'In progress'} onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value as Project['status'] })}>{['In progress', 'Concept / build', 'Selected work', 'Archived'].map((x) => <option key={x}>{x}</option>)}</select></label><label className="switch-row"><span><b>Publish to public site</b><small>Visible in selected work.</small></span><input type="checkbox" checked={Boolean(editingProject.published)} onChange={(e) => setEditingProject({ ...editingProject, published: e.target.checked })}/></label><label className="switch-row"><span><b>Feature near the top</b><small>Show before regular projects.</small></span><input type="checkbox" checked={Boolean(editingProject.featured)} onChange={(e) => setEditingProject({ ...editingProject, featured: e.target.checked })}/></label><button className="btn btn-dark editor-save" type="submit" disabled={busy}><Save size={15}/>{busy ? 'Saving…' : 'Save project'} <ArrowUpRight size={14}/></button></section><section className="admin-panel editor-cover-panel"><div className="admin-panel-head"><div><span>PROJECT VISUAL</span><h2>Cover preview</h2></div><Upload size={17}/></div><label><span>IMAGE URL OR UPLOAD PATH</span><input value={editingProject.cover || ''} onChange={(e) => setEditingProject({ ...editingProject, cover: e.target.value })} placeholder="/uploads/project.webp"/></label>{editingProject.cover && <img className="cover-upload-preview" src={editingProject.cover} alt="Project preview"/>}<label className="upload-drop"><Upload size={18}/><span>Upload image from device</span><small>PNG, JPG, WEBP or GIF · max 5 MB</small><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadImage(file, (url) => setEditingProject((p) => p ? { ...p, cover: url } : p)); e.currentTarget.value = '' }}/></label><label><span>ART ACCENT</span><div className="color-picker-row"><input type="color" value={editingProject.accent || '#d9f4e9'} onChange={(e) => setEditingProject({ ...editingProject, accent: e.target.value })}/><code>{editingProject.accent || '#d9f4e9'}</code></div></label></section></aside></form> : <section className="admin-panel list-panel"><div className="list-panel-toolbar"><div><span>PORTFOLIO INDEX</span><h2>{projects.length} projects <span>· {projects.filter((p) => p.published).length} visible</span></h2></div><label className="admin-search"><Search size={15}/><input value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} placeholder="Search projects"/></label></div><div className="admin-table-head"><span>PROJECT</span><span>CATEGORY</span><span>STATUS</span><span>VISIBILITY</span><span>ACTIONS</span></div>{matchingProjects.map((project) => <div className="admin-table-row" key={project.id}><div className="table-record-main"><span className="record-cover" style={{ background: project.accent }}>{project.cover ? <img src={project.cover} alt=""/> : <Asterisk size={18}/>}</span><span><b>{project.name}</b><small>{project.tagline || project.description}</small></span></div><span className="table-secondary">{project.category}</span><span className="table-secondary">{project.status}</span><span><i className={`status-chip ${project.published ? 'status-published' : 'status-draft'}`}>{project.published ? 'visible' : 'hidden'}</i></span><div className="table-actions"><button className="icon-btn" aria-label={`Edit ${project.name}`} onClick={() => setEditingProject({ ...project })}><Pencil size={15}/></button><button className="icon-btn icon-danger" aria-label={`Delete ${project.name}`} onClick={() => void deleteRecord('projects', project.id)}><Trash2 size={15}/></button></div></div>)}{matchingProjects.length === 0 && <div className="admin-empty"><FolderKanban size={20}/><p>No projects match this search.</p></div>}</section>)}

      {activeView === 'inquiries' && (selectedMessage ? <div className="inquiry-detail-grid"><section className="admin-panel inquiry-read-panel"><div className="editor-toolbar"><span><Inbox size={15}/> INQUIRY / MESSAGE</span><button className="text-link" onClick={() => setSelectedMessage(null)}><ArrowLeft size={14}/> Back to inbox</button></div><div className="inquiry-subject"><span className="inquiry-avatar">{selectedMessage.name.trim().slice(0, 1).toUpperCase()}</span><div><h2>{selectedMessage.name}</h2><a href={`mailto:${selectedMessage.email}`}>{selectedMessage.email} <ArrowUpRight size={13}/></a><span>Received {new Date(selectedMessage.createdAt).toLocaleString()}</span></div></div><div className="inquiry-context"><div><span>PROJECT TYPE</span><b>{selectedMessage.type || 'Not specified'}</b></div><div><span>BUDGET</span><b>{selectedMessage.budget || 'Not specified'}</b></div><div><span>COMPANY / PROJECT</span><b>{selectedMessage.company || 'Not provided'}</b></div></div><div className="inquiry-message"><span>MESSAGE</span><p>{selectedMessage.message}</p></div><div className="inquiry-actions"><a className="btn btn-dark" href={`mailto:${selectedMessage.email}?subject=${encodeURIComponent(`Re: Your project inquiry${selectedMessage.company ? ` — ${selectedMessage.company}` : ''}`)}`}><Mail size={15}/> Reply by email <ArrowUpRight size={15}/></a><button className="btn btn-light" onClick={() => void updateMessageRead(selectedMessage, !selectedMessage.readAt)}>{selectedMessage.readAt ? 'Mark unread' : 'Mark as read'}</button><button className="icon-btn icon-danger" onClick={() => void deleteMessage(selectedMessage)} aria-label="Delete inquiry"><Trash2 size={16}/></button></div></section><aside className="admin-panel inquiry-help"><Eyebrow>FOLLOW-UP</Eyebrow><h3>Close the loop.</h3><p>This admin keeps the inquiry available to you. Replies are sent from your email app so the visitor gets a real response from you.</p><span className="inquiry-tip"><Asterisk size={18}/> A personal reply is better than a fake automated confirmation.</span></aside></div> : <div className="inquiry-list-wrap"><section className="admin-panel list-panel"><div className="list-panel-toolbar"><div><span>CONTACT FORM</span><h2>{messages.length} inquiries <span>· {messages.filter((m) => !m.readAt).length} unread</span></h2></div><button className="btn btn-light" onClick={() => void loadAll()}><ArrowUpRight size={14}/> Refresh inbox</button></div>{messages.length ? <div className="inquiry-list">{messages.map((message) => <button key={message.id} className={`inquiry-row ${!message.readAt ? 'inquiry-row-unread' : ''}`} onClick={() => { setSelectedMessage(message); if (!message.readAt) void updateMessageRead(message, true) }}><span className="inquiry-avatar">{message.name.trim().slice(0, 1).toUpperCase()}</span><span className="inquiry-row-main"><b>{message.name}<small>{message.company || message.type || 'Project inquiry'}</small></b><span>{message.message}</span></span><span className="inquiry-row-meta"><time>{formatDate(message.createdAt.slice(0, 10))}</time><small>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></span>{!message.readAt && <i className="unread-dot"/>}<ArrowRight size={15}/></button> )}</div> : <div className="admin-empty"><Inbox size={23}/><h3>Nothing in the inbox yet.</h3><p>New project inquiries from your contact form appear here.</p><a className="text-link" href="/#contact" target="_blank" rel="noreferrer">Preview the contact form <ArrowUpRight size={14}/></a></div>}</section><div className="admin-bottom-strip"><span><LockKeyhole size={14}/> PRIVATE BY DEFAULT</span><p>Inquiries are stored in your local data file. Back up `data/db.json` regularly and use durable storage when deployed.</p></div></div>)}

      {activeView === 'settings' && <form className="settings-layout" onSubmit={saveSettings}><section className="admin-panel settings-main"><div className="admin-panel-head"><div><span>PUBLIC IDENTITY</span><h2>The details people meet first.</h2></div><UserRound size={19}/></div><div className="settings-two-col"><label><span>DISPLAY NAME</span><input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })}/></label><label><span>PROFESSIONAL TITLE</span><input value={settings.title} onChange={(e) => setSettings({ ...settings, title: e.target.value })}/></label></div><label><span>EYEBROW / LOCATION LINE</span><input value={settings.eyebrow} onChange={(e) => setSettings({ ...settings, eyebrow: e.target.value })}/></label><div className="settings-two-col"><label><span>HERO LINE 1</span><input value={settings.headlineA} onChange={(e) => setSettings({ ...settings, headlineA: e.target.value })}/></label><label><span>HERO LINE 2</span><input value={settings.headlineB} onChange={(e) => setSettings({ ...settings, headlineB: e.target.value })}/></label></div><label><span>HERO LINE 3 / EMPHASIS</span><input value={settings.headlineC} onChange={(e) => setSettings({ ...settings, headlineC: e.target.value })}/></label><label><span>SHORT INTRO</span><textarea rows={3} value={settings.intro} onChange={(e) => setSettings({ ...settings, intro: e.target.value })} maxLength={3000}/></label><label><span>ABOUT ME</span><textarea rows={5} value={settings.about} onChange={(e) => setSettings({ ...settings, about: e.target.value })} maxLength={3000}/></label><div className="settings-two-col"><label><span>PRIMARY HERO CTA LABEL</span><input value={settings.heroPrimaryLabel || 'Explore My Work'} onChange={(e) => setSettings({ ...settings, heroPrimaryLabel: e.target.value })} maxLength={50}/></label><label><span>SECONDARY HERO CTA LABEL</span><input value={settings.heroSecondaryLabel || 'Let’s Talk'} onChange={(e) => setSettings({ ...settings, heroSecondaryLabel: e.target.value })} maxLength={50}/></label></div><label><span>PROFILE IMAGE URL OR UPLOAD PATH</span><input value={settings.profileImage || ''} onChange={(e) => setSettings({ ...settings, profileImage: e.target.value })} placeholder="/uploads/krish-portrait.webp"/></label>{settings.profileImage && <img className="settings-profile-preview" src={settings.profileImage} alt="Profile preview"/>}<label className="upload-drop settings-profile-upload"><Upload size={18}/><span>Upload personal photo from device</span><small>PNG, JPG, WEBP or GIF · max 5 MB</small><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadImage(file, (url) => setSettings((current) => ({ ...current, profileImage: url }))); e.currentTarget.value = '' }}/></label><label><span>SERVICES CONTENT <small>JSON ARRAY · UP TO FIVE ITEMS</small></span><textarea rows={12} className="services-json-editor" value={servicesDraft} onChange={(e) => setServicesDraft(e.target.value)} spellCheck={false}/></label><div className="editor-hint"><CircleHelp size={15}/><span>Each service needs a <code>title</code> and a <code>description</code>. Valid JSON is checked before saving.</span></div><div className="admin-panel-head settings-subhead"><div><span>CONTACT & SOCIAL</span><h2>Where people can find you.</h2></div><Link2 size={19}/></div><div className="settings-two-col"><label><span>PUBLIC EMAIL</span><input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })}/></label><label><span>LOCATION / TIMEZONE</span><input value={settings.location} onChange={(e) => setSettings({ ...settings, location: e.target.value })}/></label></div><label><span>AVAILABILITY TEXT</span><input value={settings.availability} onChange={(e) => setSettings({ ...settings, availability: e.target.value })}/></label><div className="settings-two-col"><label><span>GITHUB URL</span><input value={settings.github} onChange={(e) => setSettings({ ...settings, github: e.target.value })} placeholder="https://github.com/…"/></label><label><span>LINKEDIN URL</span><input value={settings.linkedin} onChange={(e) => setSettings({ ...settings, linkedin: e.target.value })} placeholder="https://linkedin.com/in/…"/></label></div><div className="settings-two-col"><label><span>INSTAGRAM URL</span><input value={settings.instagram} onChange={(e) => setSettings({ ...settings, instagram: e.target.value })} placeholder="https://instagram.com/…"/></label><label><span>RESUME URL</span><input value={settings.resumeUrl} onChange={(e) => setSettings({ ...settings, resumeUrl: e.target.value })} placeholder="Optional public resume link"/></label></div><div className="settings-seo-block"><div className="admin-panel-head settings-subhead"><div><span>SEARCH & SHARING</span><h2>Default search appearance.</h2></div><Globe size={19}/></div><label><span>DEFAULT SEO TITLE</span><input value={settings.seoTitle || ''} onChange={(e) => setSettings({ ...settings, seoTitle: e.target.value })} placeholder="Krish Sarkar — Freelance Web Developer" maxLength={180}/></label><label><span>DEFAULT META DESCRIPTION</span><textarea rows={3} value={settings.seoDescription || ''} onChange={(e) => setSettings({ ...settings, seoDescription: e.target.value })} placeholder="A concise description of the website" maxLength={420}/></label></div><button className="btn btn-dark settings-save" type="submit" disabled={busy}><Save size={15}/>{busy ? 'Saving settings…' : 'Save site settings'} <ArrowUpRight size={14}/></button></section><aside className="settings-aside"><div className="admin-panel settings-preview"><Eyebrow>LIVE IDENTITY PREVIEW</Eyebrow><div className="settings-preview-mark">k<span>.</span></div><h3>{settings.name || 'Your name'}</h3><p>{settings.title}</p><div className="settings-preview-line"/><span>{settings.availability}</span><a href="/" target="_blank" rel="noreferrer">Open live site <ArrowUpRight size={13}/></a></div><div className="admin-panel settings-note"><Asterisk size={20}/><b>Keep the public details real.</b><p>Only add profiles you use, links that work, and availability you can honor. Settings update the website after saving.</p></div><div className="admin-panel settings-color"><span>ACCENT COLOR</span><p>The signature color is a subtle note, not the whole design.</p><div className="color-picker-row"><input type="color" value={settings.accent || '#a7e8d1'} onChange={(e) => setSettings({ ...settings, accent: e.target.value })}/><code>{settings.accent || '#a7e8d1'}</code></div></div></aside></form>}
    </div></main></div>
}

export default function App() {
  return window.location.pathname.startsWith('/admin') ? <AdminApp/> : <PublicApp/>
}
