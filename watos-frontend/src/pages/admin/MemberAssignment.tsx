import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import client from '@/api/client'
import type { User } from '@/types'
import { 
  UserPlus, Brain, Sparkles, ChevronRight, CheckCircle2, 
  AlertCircle, Users, Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Candidate {
  operator_id: string
  full_name: string
  email: string
  skills: string[]
  team_size: number
  team_utilization: number
  combined_score: number
  reason: string
}

interface SuggestionResponse {
  member_id: string
  recommended: Candidate | null
  candidates: Candidate[]
}

const MemberAssignment = () => {
  const [unassigned, setUnassigned] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<User | null>(null)
  
  const [suggestion, setSuggestion] = useState<SuggestionResponse | null>(null)
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)
  
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')


  const fetchUnassigned = async () => {
    setLoading(true)
    try {
      const { data } = await client.get('/users/unassigned')
      setUnassigned(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

    useEffect(() => {
      (async () => {
        await fetchUnassigned();
      })();
    }, [])

  const handleSelectMember = async (member: User) => {
    setSelectedMember(member)
    setSelectedOperatorId(null)
    setSuggestion(null)
    setSuccessMsg('')
    setLoadingSuggestion(true)
    
    try {
      const { data } = await client.get(`/intelligence/suggest-operator?member_id=${member.id}`)
      setSuggestion(data)
      if (data.recommended) {
        setSelectedOperatorId(data.recommended.operator_id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSuggestion(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedMember || !selectedOperatorId) return
    setAssigning(true)
    
    try {
      await client.post(`/users/${selectedMember.id}/assign`, {
        operator_id: selectedOperatorId
      })
      
      setSuccessMsg(`Successfully assigned ${selectedMember.full_name || selectedMember.email}`)
      setUnassigned(prev => prev.filter(m => m.id !== selectedMember.id))
      setSelectedMember(null)
      setSuggestion(null)
      
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen flex flex-col">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 flex items-center gap-3">
          <UserPlus className="text-indigo-500 shrink-0" size={24} />
          Assign Members
        </h1>
        <p className="text-xs md:text-sm text-zinc-500 font-medium mt-1">
          Review signups and assign them based on ML recommendations.
        </p>
      </div>

      {successMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center gap-3 border border-emerald-100"
        >
          <CheckCircle2 size={18} className="shrink-0" />
          <p className="font-bold text-sm">{successMsg}</p>
        </motion.div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* Left Panel: Unassigned Queue */}
        <div className="lg:col-span-4 flex flex-col bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm max-h-[400px] lg:max-h-none lg:h-[calc(100vh-240px)]">
          <div className="p-4 md:p-5 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between shrink-0">
            <h2 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-500">Unassigned Queue</h2>
            <span className="px-2 py-0.5 bg-zinc-200 text-zinc-600 rounded-lg text-[10px] font-bold">
              {unassigned.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-2xl" />)}
              </div>
            ) : unassigned.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 min-h-[200px]">
                <CheckCircle2 size={32} className="text-zinc-200 mb-3" />
                <p className="text-sm font-bold text-zinc-400">Queue is empty</p>
                <p className="text-[10px] text-zinc-400 mt-1">All members assigned.</p>
              </div>
            ) : (
              unassigned.map(member => (
                <button
                  key={member.id}
                  onClick={() => handleSelectMember(member)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl transition-all border",
                    selectedMember?.id === member.id 
                      ? "bg-indigo-50 border-indigo-200 shadow-md shadow-indigo-900/5" 
                      : "bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-sm"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="font-black text-sm text-zinc-900 truncate">{member.full_name || 'Unnamed User'}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{member.email}</p>
                    </div>
                    <ChevronRight size={14} className={cn("transition-colors shrink-0", selectedMember?.id === member.id ? "text-indigo-500" : "text-zinc-300")} />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {member.skills?.slice(0,3).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[9px] font-bold uppercase tracking-wider">
                        {s}
                      </span>
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Assignment Options */}
        <div className="lg:col-span-8 flex flex-col bg-zinc-50 rounded-3xl overflow-hidden border border-zinc-100 lg:h-[calc(100vh-240px)]">
          {!selectedMember ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
              <div className="h-16 w-16 bg-white rounded-3xl shadow-sm border border-zinc-100 flex items-center justify-center mb-4">
                <Brain size={24} className="text-zinc-300" />
              </div>
              <h3 className="text-lg font-black text-zinc-400">Select a Member</h3>
              <p className="text-xs md:text-sm text-zinc-400 mt-2 max-w-xs">
                Choose a member to see ML recommendations.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-5 md:p-6 bg-white border-b border-zinc-100 shrink-0">
                <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400 mb-2">Assigning</p>
                <h2 className="text-xl md:text-2xl font-black text-zinc-900 truncate">{selectedMember.full_name || selectedMember.email}</h2>
                <p className="text-xs md:text-sm text-zinc-500 mt-1 font-medium">Capacity: {selectedMember.capacity_hours}h/week</p>
              </div>

              <div className="flex-1 p-5 md:p-6 overflow-y-auto custom-scrollbar">
                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2 mb-4">
                  <Sparkles size={14} className="text-indigo-500" /> 
                  Operator Recommendations
                </h3>

                {loadingSuggestion ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-32 bg-zinc-100 rounded-2xl animate-pulse" />)}
                  </div>
                ) : suggestion?.candidates ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {suggestion.candidates.map((candidate, idx) => {
                      const isRecommended = suggestion.recommended?.operator_id === candidate.operator_id
                      const isSelected = selectedOperatorId === candidate.operator_id

                      return (
                        <div 
                          key={candidate.operator_id}
                          onClick={() => setSelectedOperatorId(candidate.operator_id)}
                          className={cn(
                            "relative p-5 rounded-3xl border-2 transition-all cursor-pointer",
                            isSelected 
                              ? "bg-white border-indigo-500 shadow-xl shadow-indigo-900/10" 
                              : "bg-white border-transparent hover:border-zinc-200 shadow-sm"
                          )}
                        >
                          {isRecommended && (
                            <div className="absolute -top-2.5 -right-2 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg shadow-lg flex items-center gap-1">
                              <Sparkles size={9} /> Best
                            </div>
                          )}

                          <div className="flex items-start justify-between mb-4">
                            <div className="min-w-0 flex-1 mr-2">
                              <p className="font-black text-sm text-zinc-900 truncate">{candidate.full_name}</p>
                              <div className="flex items-center flex-wrap gap-2 mt-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                <span className="flex items-center gap-1"><Users size={10}/> {candidate.team_size}</span>
                                <span className="flex items-center gap-1"><Activity size={10}/> {Math.round(candidate.team_utilization * 100)}%</span>
                              </div>
                            </div>
                            <div className="h-8 w-8 shrink-0 rounded-full border-2 border-zinc-50 flex items-center justify-center bg-zinc-50 text-[10px] font-black text-zinc-300">
                              #{idx + 1}
                            </div>
                          </div>

                          <div className="p-3 bg-zinc-50/50 rounded-xl border border-zinc-100/50">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Matching Reason</p>
                            <p className="text-[11px] font-medium text-zinc-600 leading-relaxed">{candidate.reason}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-6 bg-rose-50 text-rose-600 rounded-2xl flex items-center gap-3 border border-rose-100">
                    <AlertCircle size={18} className="shrink-0" />
                    <p className="text-xs font-medium">Failed to load suggestions.</p>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="p-5 md:p-6 bg-white border-t border-zinc-100 shrink-0">
                <button
                  onClick={handleAssign}
                  disabled={!selectedOperatorId || assigning}
                  className="w-full sm:w-auto sm:float-right px-8 py-3.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-zinc-900/20 active:scale-95"
                >
                  {assigning ? 'Processing...' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MemberAssignment
