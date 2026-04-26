import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { 
  Brain, ArrowRight, Activity, 
  ChevronRight, Play, Star, Cpu 
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

// Swiper Imports
import { Swiper, SwiperSlide } from 'swiper/react'
import { 
  Navigation, Pagination, Autoplay, EffectCreative, 
  EffectCoverflow, EffectFade, Parallax 
} from 'swiper/modules'

const Landing = () => {
  const navigate = useNavigate()
  const token = useAuthStore(state => state.token)
  const isAuthenticated = !!token

  const modules = [
    {
      title: "Interactive Project Board",
      subtitle: "Engineered for speed",
      description: "Real-time task synchronization with ML-driven workload rebalancing suggestions.",
      features: ["Drag & Drop", "Live Re-balancing", "Burnout Alerts"]
    },
    {
      title: "Complexity Analytics",
      subtitle: "Beyond simple metrics",
      description: "Neural analysis of project density, skill requirements, and delivery probability.",
      features: ["Skill Radar", "Uplift Forecast", "Risk Heatmaps"]
    },
    {
      title: "PERT Critical Path",
      subtitle: "Zero-latency planning",
      description: "Fully automated dependency tracking with real-time bottleneck identification.",
      features: ["Path Density", "Float Tracking", "Auto-Scheduling"]
    }
  ]

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-zinc-900 selection:text-white font-sans tracking-tight">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-100 border-b border-zinc-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center shadow-xl shadow-zinc-900/10">
              <Brain size={22} className="text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tighter">WATOS</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-8 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              <a href="#features" className="hover:text-zinc-900 transition-colors">Intelligence</a>
              <a href="#modules" className="hover:text-zinc-900 transition-colors">Showcase</a>
              <a href="#pricing" className="hover:text-zinc-900 transition-colors">Network</a>
            </div>
            <div className="h-6 w-px bg-zinc-100 hidden md:block" />
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Button onClick={() => navigate('/tasks')} variant="default" className="rounded-xl font-bold gap-2 px-6">
                  Workspace <ArrowRight size={16} />
                </Button>
              ) : (
                <>
                  <Button variant="ghost" className="font-bold text-xs tracking-wide" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button variant="default" className="rounded-xl font-bold px-6 shadow-xl shadow-zinc-900/10" asChild>
                    <Link to="/register">Join Now</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Swiper Section */}
      <section className="relative h-screen min-h-[700px] w-full overflow-hidden">
        <Swiper
          modules={[Navigation, Pagination, Autoplay, EffectCreative, EffectFade, Parallax]}
          navigation
          pagination={{ clickable: true }}
          autoplay={{ delay: 6000, disableOnInteraction: true }}
          effect="creative"
          creativeEffect={{
            prev: { shadow: false, translate: [0, 0, -100] },
            next: { translate: ['100%', 0, 0] },
          }}
          breakpoints={{
            320: { effect: 'fade' },
            1024: { effect: 'creative' }
          }}
          parallax={true}
          speed={1000}
          className="h-full w-full"
        >
          {/* Slide 1: Predict */}
          <SwiperSlide className="bg-white flex items-center">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
              <div className="space-y-6" data-swiper-parallax="-100">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-500">
                  <Cpu size={12} /> Autonomous Prediction Core
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-8xl font-black leading-[0.95] tracking-tighter">
                  PREDICT <br />
                  <span className="text-zinc-300">BOTTLENECKS.</span>
                </h1>
                <p className="text-lg text-zinc-500 max-w-lg leading-relaxed font-medium">
                  Neural networks applied to project telemetry. Identify delivery risks with explainable 84% accuracy.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <Button size="lg" className="h-12 px-8 text-sm font-bold rounded-xl shadow-xl" asChild>
                    <Link to="/register">Get Started <ArrowRight size={16} className="ml-2" /></Link>
                  </Button>
                  <Button size="lg" variant="outline" className="h-12 px-8 text-sm font-bold rounded-xl border-2">
                    View Demo <Play size={14} className="ml-2 fill-current" />
                  </Button>
                </div>
              </div>
              <div className="hidden lg:block relative" data-swiper-parallax="-50">
                <div className="aspect-square max-w-[450px] ml-auto rounded-[3rem] overflow-hidden glass border-zinc-100 shadow-2xl relative">
                  <div className="absolute inset-0 bg-linear-to-br from-zinc-500/5 to-transparent" />
                  <div className="h-full w-full p-12 flex flex-col justify-between">
                     <div className="space-y-4">
                        <div className="h-1.5 w-1/3 bg-zinc-100 rounded-full" />
                        <div className="h-1.5 w-1/2 bg-zinc-50 rounded-full" />
                     </div>
                     <Activity size={100} className="text-zinc-100 mx-auto" />
                     <div className="flex justify-between items-end">
                        <div className="h-10 w-10 rounded-2xl bg-zinc-900" />
                        <div className="space-y-1 text-right">
                           <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-300">Operational</div>
                           <div className="h-1 w-16 bg-zinc-100 rounded-full ml-auto" />
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>

          {/* Slide 2: Optimize */}
          <SwiperSlide className="bg-zinc-50/5 flex items-center">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
              <div className="space-y-6" data-swiper-parallax="-100">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-zinc-200 text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-500">
                   Real-time Optimization
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-8xl font-black leading-[0.95] tracking-tighter">
                  OPTIMIZE <br />
                  <span className="text-zinc-300">WORKFLOW.</span>
                </h1>
                <p className="text-lg text-zinc-500 max-w-lg leading-relaxed font-medium">
                  Automated re-balancing that considers individual skill gaps and burnout telemetry in real-time.
                </p>
                <Button size="lg" className="h-12 px-8 text-sm font-bold rounded-xl shadow-xl" asChild>
                  <Link to="/register">Explore Logic</Link>
                </Button>
              </div>
              <div className="hidden lg:grid grid-cols-2 gap-4 max-w-[450px] ml-auto" data-swiper-parallax="-50">
                 {[1,2,3,4].map(i => (
                   <div key={i} className="aspect-square glass rounded-[2.5rem] flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full border-2 border-dashed border-zinc-200" />
                   </div>
                 ))}
              </div>
            </div>
          </SwiperSlide>
        </Swiper>
      </section>

      {/* Modules Showcase Section (Coverflow) */}
      <section id="modules" className="py-48 px-6 bg-white overflow-hidden border-y border-zinc-100">
        <div className="max-w-7xl mx-auto mb-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400">The Neural Stack</div>
              <h2 className="text-4xl lg:text-6xl font-black tracking-tighter">Core Intelligence</h2>
            </div>
            <p className="text-zinc-500 max-w-md font-medium text-sm leading-relaxed">
              Proprietary modules designed to handle everything from task dependency to workload distribution.
            </p>
          </div>
        </div>

        <Swiper
          modules={[EffectCoverflow, Pagination, Navigation, Autoplay]}
          effect="coverflow"
          grabCursor={true}
          centeredSlides={true}
          loop={true}
          coverflowEffect={{
            rotate: 0,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: false,
          }}
          breakpoints={{
            320: { slidesPerView: 1.2, spaceBetween: 20 },
            768: { slidesPerView: 2, spaceBetween: 40 },
            1280: { slidesPerView: 3, spaceBetween: 60 }
          }}
          autoplay={{ delay: 5000 }}
          pagination={{ clickable: true }}
          className="max-w-7xl overflow-visible!"
        >
          {([...modules, ...modules]).map((mod, idx) => (
            <SwiperSlide key={idx} className="pb-16 select-none cursor-grab active:cursor-grabbing">
              <div className="bg-zinc-50/40 rounded-[3rem] border border-zinc-100 p-10 md:p-14 shadow-sm hover:shadow-2xl transition-all duration-500 group">
                 <div className="aspect-video rounded-2xl bg-white flex items-center justify-center border border-zinc-200 mb-10 group-hover:scale-[1.02] transition-transform">
                    <Activity size={48} className="text-zinc-100" />
                 </div>
                 <div className="space-y-4">
                    <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-400">{mod.subtitle}</div>
                    <h3 className="text-2xl font-black tracking-tight">{mod.title}</h3>
                    <p className="text-zinc-500 leading-relaxed font-medium text-xs h-12 overflow-hidden">{mod.description}</p>
                 </div>
                 <div className="flex flex-wrap gap-2 pt-8">
                    {mod.features.map(f => (
                      <Badge key={f} variant="outline" className="rounded-md bg-white border-zinc-200 text-[8px] font-bold tracking-widest px-3 py-1 uppercase scale-90">
                         {f}
                      </Badge>
                    ))}
                 </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* Social Proof & CTA */}
      <section className="py-48 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-10">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 font-bold text-[9px] uppercase tracking-[0.2em] text-zinc-500">
              <Star className="fill-current text-zinc-900" size={10} /> Premium Intelligence
           </div>
           <h2 className="text-4xl lg:text-7xl font-black tracking-tighter leading-[0.95]">READY TO <br /><span className="text-zinc-200">AUTOMATE?</span></h2>
           <p className="text-lg text-zinc-500 font-medium max-w-md mx-auto">
              Join the cohort of high-performance teams using WATOS for life-cycle mastery.
           </p>
           <div className="flex flex-col items-center gap-10 pt-10">
              <Button size="lg" className="h-14 px-10 rounded-4xl font-bold text-base shadow-2xl flex items-center gap-3 transition-transform hover:scale-105" asChild>
                <Link to="/register">Create Your Instance <ChevronRight size={18} /></Link>
              </Button>
              <div className="flex items-center gap-5 text-left opacity-60">
                 <div className="flex -space-x-3">
                   {[1,2,3].map(i => (
                     <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-zinc-100" />
                   ))}
                 </div>
                 <div className="text-[10px] font-bold tracking-widest uppercase">
                    Trusted by 500+ Engineers
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-6 border-t border-zinc-100 bg-zinc-50/30">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-20">
          <div className="md:col-span-2 space-y-8">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center">
                <Brain size={18} className="text-white" />
              </div>
              <span className="font-bold text-xl tracking-tighter">WATOS</span>
            </div>
            <p className="text-zinc-500 max-w-xs font-medium text-xs leading-relaxed">
              Advancing project intelligence through explainable AI and neural optimization.
            </p>
          </div>
          <div className="grid grid-cols-2 md:col-span-2 gap-10">
            <div className="space-y-6">
              <h5 className="font-bold text-[9px] uppercase tracking-[0.4em] text-zinc-400">Resources</h5>
              <div className="flex flex-col gap-4 text-xs font-bold text-zinc-500/80">
                 <a href="#" className="hover:text-zinc-900 transition-colors">Documentation</a>
                 <a href="#" className="hover:text-zinc-900 transition-colors">ML Baseline</a>
                 <a href="#" className="hover:text-zinc-900 transition-colors">API Keys</a>
              </div>
            </div>
            <div className="space-y-6">
              <h5 className="font-bold text-[9px] uppercase tracking-[0.4em] text-zinc-400">Governance</h5>
              <div className="flex flex-col gap-4 text-xs font-bold text-zinc-500/80">
                 <a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
                 <a href="#" className="hover:text-zinc-900 transition-colors">Status</a>
                 <a href="#" className="hover:text-zinc-900 transition-colors">Security</a>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-24 mt-24 border-t border-zinc-50 flex justify-between items-center text-[8px] font-bold uppercase tracking-[0.5em] text-zinc-300">
           <span>Core Operation Engine v1.0.4</span>
           <span>Distributed System</span>
        </div>
      </footer>
    </div>
  )
}

interface BadgeProps {
  children: React.ReactNode
  variant?: 'outline' | 'default'
  className?: string
}

const Badge = ({ children, variant, className }: BadgeProps) => (
  <div className={cn(
    "px-3 py-1 text-[10px] font-bold uppercase tracking-widest border",
    variant === 'outline' ? "border-zinc-100 text-zinc-500" : "bg-zinc-900 text-white",
    className
  )}>
    {children}
  </div>
)

export default Landing

