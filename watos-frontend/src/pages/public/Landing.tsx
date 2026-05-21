import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Brain, ArrowRight,
  ChevronRight, Layers, Check,
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
      features: ["Drag & Drop", "Live Re-balancing", "Overload Alerts"]
    },
    {
      title: "Complexity Analytics",
      description: "Neural analysis of project density, skill requirements, and delivery probability.",
      icon: <Layers size={24} />,
      features: ["Skill Radar", "Risk Heatmaps"]
    },
    {
      title: "PERT Critical Path",
      description: "Fully automated dependency tracking with real-time bottleneck identification.",
      icon: <Layers size={24} />,
      features: ["Path Density", "Float Tracking"]
    }
  ]

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-zinc-100/50 bg-white/60 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="h-10 w-10 overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-105">
              <img
                src="/logo.png"
                alt="WATOS Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="font-bold text-2xl tracking-tighter">WATOS</span>
          </div>

          <div className="flex items-center gap-10">
            <div className="hidden md:flex items-center gap-10 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-zinc-900 transition-colors">Process</a>
              <a href="#preview" className="hover:text-zinc-900 transition-colors">Interface</a>
            </div>
            <div className="h-5 w-px bg-zinc-100 hidden md:block" />
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Button onClick={() => navigate('/tasks')} className="btn-premium rounded-full font-bold gap-2 px-8 h-11 text-sm">
                  Workspace <ArrowRight size={16} />
                </Button>
              ) : (
                <>
                  <Button variant="ghost" className="font-bold text-xs tracking-wider h-11 hover:bg-zinc-100/50 hover:text-zinc-900 px-6 rounded-full transition-all duration-300" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button className="btn-premium rounded-full font-bold px-8 h-11 text-sm" asChild>
                    <Link to="/register">Join Now</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-52 pb-40 overflow-hidden flex flex-col items-center">
        {/* Organic Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-linear-to-b from-zinc-50 to-white -z-10" />
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-[140px] -z-10 animate-float" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-slate-100/40 rounded-full blur-[120px] -z-10 animate-float-delayed" />

        <div className="max-w-4xl mx-auto px-6 text-center space-y-10">

          <h1 className="text-6xl md:text-8xl font-bold leading-[1.05] tracking-tighter text-gradient-subtle">
            Predict. Optimize. <br />
            Deliver.
          </h1>
          <p className="text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed font-medium">
            The high-precision workload analysis system that turns complex project telemetry into actionable intelligence. Built for teams that value clarity and performance.
          </p>
          <div className="flex flex-wrap justify-center gap-5 pt-6">
            {isAuthenticated ? (
              <Button size="lg" className="btn-premium h-16 px-12 text-lg font-bold rounded-full" asChild>
                <Link to="/tasks">Go to Workspace <ArrowRight size={20} className="ml-2" /></Link>
              </Button>
            ) : (
              <Button size="lg" className="btn-premium h-16 px-12 text-lg font-bold rounded-full" asChild>
                <Link to="/register">Get Started <ArrowRight size={20} className="ml-2" /></Link>
              </Button>
            )}
          </div>
        </div>

      </section>


      {/* Features Grid */}
      <section id="features" className="py-48 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-zinc-50 rounded-full blur-[100px] -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-24 space-y-6">
            <h2 className="text-5xl md:text-6xl font-bold tracking-tighter leading-tight text-gradient-subtle">
              Built for high-precision <br /> operations.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {modules.map((mod, idx) => (
              <div key={idx} className="group p-10 rounded-[2.5rem] glass-panel border-zinc-100/50 transition-all duration-700 hover:-translate-y-4">
                <div className="h-14 w-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-10 text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-all duration-500 shadow-sm">
                  {mod.icon}
                </div>
                <h3 className="text-2xl font-bold mb-5 tracking-tight">{mod.title}</h3>
                <p className="text-zinc-500 text-base leading-relaxed mb-10 font-medium">
                  {mod.description}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {mod.features.map(f => (
                    <span key={f} className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-4 py-1.5 bg-white/50 rounded-full border border-zinc-100">
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
      <section id="how-it-works" className="py-48 px-6 bg-zinc-50/30 border-y border-zinc-100/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-slate-50 rounded-full blur-[120px] -z-10" />

        <div className="max-w-7xl mx-auto text-center">
          <div className="max-w-2xl mx-auto mb-32 space-y-6">
            <h2 className="text-5xl font-bold tracking-tighter text-gradient-subtle">From data to optimization.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-20 items-start relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-16 left-[15%] right-[15%] h-[2px] bg-linear-to-r from-transparent via-zinc-200 to-transparent -z-10" />

            {[
              { step: "01", title: "Ingest Tasks", desc: "Input your team's workload or connect existing project boards.", icon: <Globe size={28} /> },
              { step: "02", title: "Neural Analysis", desc: "Our engine analyzes skill gaps, complexity, and dependencies.", icon: <Brain size={28} /> },
              { step: "03", title: "Optimal Output", desc: "Receive real-time rebalancing suggestions and risk alerts.", icon: <Check size={28} /> }
            ].map((step, idx) => (
              <div key={idx} className="group space-y-8 relative">
                <div className="h-32 w-32 rounded-[2.5rem] bg-white border border-zinc-100 shadow-xl shadow-zinc-200/20 flex items-center justify-center mx-auto relative transition-all duration-500 group-hover:-translate-y-2 group-hover:rotate-6">
                  <div className="text-zinc-900">{step.icon}</div>
                  <div className="absolute -top-3 -right-3 h-10 w-10 rounded-2xl bg-zinc-900 text-white text-[11px] font-bold flex items-center justify-center shadow-lg">
                    {step.step}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-2xl font-bold tracking-tight">{step.title}</h4>
                  <p className="text-zinc-500 text-base max-w-[280px] mx-auto leading-relaxed font-medium">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Preview Slider */}
      <section id="preview" className="py-20 md:py-28 px-6 overflow-hidden relative">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-5xl max-h-5xl bg-indigo-50/20 rounded-full blur-[180px] -z-10" />

        <div className="max-w-7xl mx-auto mb-12 text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-gradient-subtle">The Workspace Experience</h2>
        </div>

        <div className="max-w-7xl mx-auto">
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
            autoplay={{ delay: 3000 }}
            pagination={{ clickable: true }}
            className="pb-16 overflow-visible!"
          >
            {[
              { img: "/screenshots/Project_overview.png", title: "Project Overview" },
              { img: "/screenshots/Analytics2.png", title: "Predictive Analytics" },
              { img: "/screenshots/MemberAssigned.png", title: "Resource Allocation" },
              { img: "/screenshots/Workload.png", title: "Workload Balancing" }
            ].map((slide, idx) => (
              <SwiperSlide key={idx} className="w-[85%] md:w-[60%] lg:w-[50%] max-w-[760px]">
                <div className="showcase-card group relative rounded-xl md:rounded-2xl overflow-hidden border border-zinc-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05),0_0_1px_rgba(0,0,0,0.06)] bg-zinc-50 select-none">
                  {/* Top-left small title (light weight, subtle tracking) */}
                  <div className="absolute top-5 left-5 md:top-6 md:left-6 z-20 pointer-events-none">
                    <span className="text-[10px] font-medium tracking-[0.2em] text-zinc-400 uppercase select-none">{slide.title}</span>
                  </div>

                  <img
                    src={slide.img}
                    alt={slide.title}
                    className="w-full aspect-[16/9] object-cover transition-transform duration-1000 ease-out scale-100 group-hover:scale-[1.025]"
                  />


                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-52 px-6 relative overflow-hidden">
        {/* Organic Background Blowouts */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-50/40 rounded-full blur-[160px] -z-10 animate-pulse" />

        <div className="max-w-5xl mx-auto text-center space-y-14 relative">

          <h2 className="text-6xl md:text-8xl font-bold tracking-tighter leading-[1] text-gradient-subtle">
            Ready to optimize <br />
            your workflow?
          </h2>
          <p className="text-2xl text-zinc-500 font-medium max-w-xl mx-auto leading-relaxed">
            Start your free instance today.
          </p>
          <div className="flex flex-col items-center gap-12 pt-10">
            <Button size="lg" className="btn-premium h-18 px-20 rounded-full font-bold text-xl" asChild>
              <Link to="/register">Create Your Instance <ChevronRight size={24} className="ml-1" /></Link>
            </Button>
            <div className="flex flex-col items-center gap-6">
              <div className="flex -space-x-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 w-10 rounded-full border-4 border-white bg-zinc-100 shadow-sm" />
                ))}
              </div>
              <div className="text-[11px] font-bold tracking-[0.4em] uppercase text-zinc-400">
                Trusted by high-performance teams
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 px-6 border-t border-zinc-100/50 bg-white relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-zinc-50 rounded-full blur-[100px] -z-10" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-24">
          <div className="md:col-span-2 space-y-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-xl shadow-sm">
                <img
                  src="/logo.png"
                  alt="WATOS Logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="font-bold text-2xl tracking-tighter">WATOS</span>
            </div>
            <p className="text-zinc-400 max-w-sm font-medium text-sm leading-relaxed">
              System for Task Optimization and Workload Balancing.
            </p>
          </div>
          <div className="grid grid-cols-2 md:col-span-2 gap-12">
            <div className="space-y-8">
              <h5 className="font-bold text-[11px] uppercase tracking-[0.4em] text-zinc-900">Resources</h5>
              <div className="flex flex-col gap-5 text-sm font-bold text-zinc-400">
                <a href="#" className="hover:text-zinc-900 transition-colors">Documentation</a>
                <a href="#" className="hover:text-zinc-900 transition-colors">API Reference</a>
                <a href="#" className="hover:text-zinc-900 transition-colors">System Status</a>
              </div>
            </div>
            <div className="space-y-8">
              <h5 className="font-bold text-[11px] uppercase tracking-[0.4em] text-zinc-900">Company</h5>
              <div className="flex flex-col gap-5 text-sm font-bold text-zinc-400">
                <a href="#" className="hover:text-zinc-900 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-zinc-900 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-zinc-900 transition-colors">Security</a>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-24 mt-24 border-t border-zinc-50 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-300">
          <span>Core Operation Engine v2.0.4</span>
          <span>&copy; 2026 WATOSSystem. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}

export default Landing

