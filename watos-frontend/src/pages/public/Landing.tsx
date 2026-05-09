import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Brain, ArrowRight, Activity,
  ChevronRight, Play, Cpu,
  BarChart3, Layers, Zap, Check,
  Globe
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

// Swiper Imports
import { Swiper, SwiperSlide } from 'swiper/react'
import {
  Navigation, Pagination, Autoplay,
  EffectCoverflow
} from 'swiper/modules'

const Landing = () => {
  const navigate = useNavigate()
  const token = useAuthStore(state => state.token)
  const isAuthenticated = !!token

  const modules = [
    {
      title: "Interactive Project Board",
      description: "Real-time task synchronization with ML-driven workload rebalancing suggestions.",
      icon: <Layers size={24} />,
      features: ["Drag & Drop", "Live Re-balancing", "Burnout Alerts"]
    },
    {
      title: "Complexity Analytics",
      description: "Neural analysis of project density, skill requirements, and delivery probability.",
      icon: <BarChart3 className="text-zinc-900" size={24} />,
      features: ["Skill Radar", "Uplift Forecast", "Risk Heatmaps"]
    },
    {
      title: "PERT Critical Path",
      description: "Fully automated dependency tracking with real-time bottleneck identification.",
      icon: <Activity className="text-zinc-900" size={24} />,
      features: ["Path Density", "Float Tracking", "Auto-Scheduling"]
    }
  ]

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-zinc-900 selection:text-white font-sans tracking-tight">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-zinc-100 bg-white/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center">
              <Brain size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tighter">WATOS</span>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-zinc-900 transition-colors">Process</a>
              <a href="#preview" className="hover:text-zinc-900 transition-colors">Interface</a>
            </div>
            <div className="h-4 w-px bg-zinc-200 hidden md:block" />
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Button onClick={() => navigate('/tasks')} variant="default" className="rounded-full font-semibold gap-2 px-6 h-9 text-sm transition-transform hover:scale-105 active:scale-95">
                  Workspace <ArrowRight size={14} />
                </Button>
              ) : (
                <>
                  <Button variant="ghost" className="font-semibold text-xs tracking-wide h-9 hover:bg-zinc-50" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button variant="default" className="rounded-full font-semibold px-6 h-9 text-sm shadow-sm transition-transform hover:scale-105 active:scale-95" asChild>
                    <Link to="/register">Join Now</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] bg-zinc-50 rounded-full blur-[100px] -z-10" />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500">
              <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Intelligence Engine v2.0
            </div>
            <h1 className="text-6xl md:text-7xl font-bold leading-[1.1] tracking-tight">
              Predict. Optimize. <br />
              <span className="text-zinc-400">Deliver.</span>
            </h1>
            <p className="text-lg text-zinc-500 max-w-lg leading-relaxed font-medium">
              A high-precision workload analysis and task optimization system. We turn complex project telemetry into actionable insights, helping teams deliver faster with less burnout.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              {isAuthenticated ? (
                <Button size="lg" className="h-12 px-8 text-sm font-semibold rounded-full shadow-lg shadow-zinc-900/10 transition-transform hover:scale-105" asChild>
                  <Link to="/tasks">Go to Workspace <ArrowRight size={16} className="ml-2" /></Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" className="h-12 px-8 text-sm font-semibold rounded-full shadow-lg shadow-zinc-900/10 transition-transform hover:scale-105" asChild>
                    <Link to="/register">Get Started Free <ArrowRight size={16} className="ml-2" /></Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-8 text-sm font-semibold rounded-full border-zinc-200 transition-all hover:bg-zinc-50"
                    disabled
                    title="Demo coming soon"
                  >
                    View Demo <Play size={14} className="ml-2 fill-current" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="relative">
            {/* Mock UI Card / Layered Visual */}
            <div className="relative aspect-[4/3] rounded-[2.5rem] bg-white border border-zinc-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-8 overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-br from-indigo-50/20 to-transparent pointer-events-none" />

              {/* Header UI */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-zinc-100" />
                  <div className="h-2 w-2 rounded-full bg-zinc-100" />
                  <div className="h-2 w-2 rounded-full bg-zinc-100" />
                </div>
                <div className="h-6 w-32 rounded-full bg-zinc-50 border border-zinc-100" />
              </div>

              {/* Main Content Mock */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="h-32 rounded-2xl bg-zinc-50 border border-zinc-100 p-4 space-y-3">
                    <div className="h-2 w-2/3 bg-zinc-200 rounded-full" />
                    <div className="h-2 w-1/2 bg-zinc-100 rounded-full" />
                    <div className="flex gap-2 pt-4">
                      <div className="h-6 w-6 rounded-full bg-indigo-100" />
                      <div className="h-6 w-6 rounded-full bg-zinc-100" />
                    </div>
                  </div>
                  <div className="h-24 rounded-2xl bg-zinc-50 border border-zinc-100 p-4">
                    <Activity size={32} className="text-zinc-200" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-24 rounded-2xl bg-zinc-900 p-4 flex flex-col justify-between">
                    <div className="h-1.5 w-1/3 bg-white/20 rounded-full" />
                    <div className="text-white font-bold text-lg">94%</div>
                  </div>
                  <div className="h-32 rounded-2xl bg-zinc-50 border border-zinc-100 p-4 space-y-3">
                    <div className="h-2 w-1/2 bg-zinc-200 rounded-full" />
                    <div className="h-10 w-full rounded-lg border border-dashed border-zinc-200" />
                  </div>
                </div>
              </div>

              {/* Elevated Glass Elements */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/40 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl transition-transform duration-700 group-hover:-translate-y-2/3 flex items-center justify-center">
                <Cpu size={48} className="text-zinc-900 opacity-20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="border-y border-zinc-100 py-6">
        <div className="max-w-7xl mx-auto px-6 flex justify-center items-center gap-12 text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-400 opacity-60">
          <span>AI-assisted planning</span>
          <span className="h-1 w-1 rounded-full bg-zinc-300" />
          <span>Real-time sync</span>
          <span className="h-1 w-1 rounded-full bg-zinc-300" />
          <span>Explainable insights</span>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-20 space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-indigo-500">The Neural Stack</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Built for high-precision operations.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {modules.map((mod, idx) => (
              <div key={idx} className="group p-8 rounded-[2rem] border border-zinc-100 hover:border-zinc-200 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] transition-all duration-500 hover:-translate-y-2 bg-white">
                <div className="h-12 w-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-8 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-500">
                  {mod.icon}
                </div>
                <h3 className="text-xl font-bold mb-4">{mod.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed mb-8">
                  {mod.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {mod.features.map(f => (
                    <span key={f} className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 px-3 py-1 bg-zinc-50 rounded-md">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-32 px-6 bg-zinc-50/50 border-y border-zinc-100">
        <div className="max-w-7xl mx-auto text-center">
          <div className="max-w-2xl mx-auto mb-20 space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-400">The Workflow</div>
            <h2 className="text-4xl font-bold tracking-tight">From data to optimization.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-px bg-linear-to-r from-transparent via-zinc-200 to-transparent -z-10" />

            {[
              { step: "01", title: "Ingest Tasks", desc: "Input your team's workload or connect existing project boards.", icon: <Globe size={24} /> },
              { step: "02", title: "Neural Analysis", desc: "Our engine analyzes skill gaps, complexity, and dependencies.", icon: <Brain size={24} /> },
              { step: "03", title: "Optimal Output", desc: "Receive real-time rebalancing suggestions and risk alerts.", icon: <Check size={24} /> }
            ].map((step, idx) => (
              <div key={idx} className="space-y-6">
                <div className="h-24 w-24 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center mx-auto relative">
                  <div className="text-zinc-900">{step.icon}</div>
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
                    {step.step}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-bold">{step.title}</h4>
                  <p className="text-zinc-500 text-sm max-w-[240px] mx-auto leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Preview Slider */}
      <section id="preview" className="py-32 px-6 overflow-hidden relative">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl max-h-4xl bg-indigo-50/30 rounded-full blur-[160px] -z-10" />

        <div className="max-w-7xl mx-auto mb-20 text-center space-y-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-400">Interface</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight bg-linear-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">The Workspace Experience</h2>
        </div>

        <div className="max-w-6xl mx-auto">
          <Swiper
            modules={[EffectCoverflow, Pagination, Autoplay, Navigation]}
            effect="coverflow"
            grabCursor={true}
            centeredSlides={true}
            slidesPerView={'auto'}
            loop={true}
            coverflowEffect={{
              rotate: 0,
              stretch: 0,
              depth: 100,
              modifier: 2.5,
              slideShadows: false,
            }}
            autoplay={{ delay: 5000 }}
            pagination={{ clickable: true }}
            className="pb-24 overflow-visible!"
          >
            {[
              { title: "Task Board", img: "/screenshots/task-board.png", caption: "AI-assisted task management and rebalancing." },
              { title: "Analytics", img: "/screenshots/analytics.png", caption: "Deep neural analysis of project telemetry." },
              { title: "PERT View", img: "/screenshots/pert-view.png", caption: "Automated critical path and dependency tracking." }
            ].map((slide, idx) => (
              <SwiperSlide key={idx} className="w-[85%] md:w-[70%] lg:w-[60%]">
                <div className="group relative rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden border border-white/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] transition-all duration-700 bg-white">
                  <img
                    src={slide.img}
                    alt={slide.title}
                    className="w-full aspect-[16/10] object-cover grayscale-[40%] group-hover:grayscale-0 transition-all duration-1000 scale-[1.01] group-hover:scale-100"
                  />
                  {/* Glassy Overlay Label */}
                  <div className="absolute top-8 left-8">
                    <div className="px-5 py-2.5 rounded-2xl bg-white/60 backdrop-blur-2xl border border-white/40 shadow-xl">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-900">{slide.title}</span>
                    </div>
                  </div>
                  {/* Bottom Caption Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-10 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                    <p className="text-white text-sm font-medium tracking-wide leading-relaxed">{slide.caption}</p>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-6 border-t border-zinc-100">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-100 font-bold text-[10px] uppercase tracking-[0.2em] text-zinc-400">
            <Zap className="fill-current text-indigo-500" size={12} /> Instant Activation
          </div>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Ready to optimize your <br />
            <span className="text-zinc-200">workflow?</span>
          </h2>
          <p className="text-xl text-zinc-500 font-medium max-w-lg mx-auto leading-relaxed">
            Join the next generation of project intelligence. Start your free instance today.
          </p>
          <div className="flex flex-col items-center gap-8 pt-6">
            <Button size="lg" className="h-14 px-12 rounded-full font-bold text-base shadow-2xl shadow-zinc-900/10 transition-all hover:scale-105 active:scale-95" asChild>
              <Link to="/register">Create Your Instance <ChevronRight size={20} className="ml-1" /></Link>
            </Button>
            <div className="flex items-center gap-4 opacity-40 grayscale">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-zinc-100" />
                ))}
              </div>
              <div className="text-[10px] font-bold tracking-widest uppercase">
                Trusted by high-performance teams
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-6 border-t border-zinc-100 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-20">
          <div className="md:col-span-2 space-y-8">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center">
                <Brain size={18} className="text-white" />
              </div>
              <span className="font-bold text-xl tracking-tighter">WATOS</span>
            </div>
            <p className="text-zinc-400 max-w-xs font-medium text-xs leading-relaxed">
              Advancing project intelligence through explainable AI and neural optimization. Built for the modern engineering stack.
            </p>
          </div>
          <div className="grid grid-cols-2 md:col-span-2 gap-10">
            <div className="space-y-6">
              <h5 className="font-bold text-[10px] uppercase tracking-[0.4em] text-zinc-400">Resources</h5>
              <div className="flex flex-col gap-4 text-xs font-semibold text-zinc-500">
                <a href="#" className="hover:text-zinc-900 transition-colors">Documentation</a>
                <a href="#" className="hover:text-zinc-900 transition-colors">API Reference</a>
                <a href="#" className="hover:text-zinc-900 transition-colors">System Status</a>
              </div>
            </div>
            <div className="space-y-6">
              <h5 className="font-bold text-[10px] uppercase tracking-[0.4em] text-zinc-400">Company</h5>
              <div className="flex flex-col gap-4 text-xs font-semibold text-zinc-500">
                <a href="#" className="hover:text-zinc-900 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-zinc-900 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-zinc-900 transition-colors">Security</a>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-20 mt-20 border-t border-zinc-50 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-bold uppercase tracking-[0.5em] text-zinc-300">
          <span>Core Operation Engine v2.0.4</span>
          <span>&copy; 2026 WATOS Intelligence. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}

export default Landing

