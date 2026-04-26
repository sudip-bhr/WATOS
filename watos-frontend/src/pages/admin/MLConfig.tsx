import { useState, useEffect } from 'react'
import { AxiosError } from 'axios'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Brain, Save, Activity, Cpu } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import client from '@/api/client'
import { toast } from '@/hooks/use-toast'

interface MLSettings {
  delay_prediction_enabled: boolean
  shap_explanations_enabled: boolean
  confidence_threshold: number
  retrain_interval_days: number
  historical_data_weight: number
}

const MLConfigPage = () => {
  const [settings, setSettings] = useState<MLSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    client.get('/ml/config')
      .then(res => setSettings(res.data))
      .catch((err) => {
        console.error('Failed to fetch ML config:', err)
        toast({ title: 'Error', description: 'Failed to load ML settings from server.', variant: 'destructive' })
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await client.put('/ml/config', settings)
      toast({ title: 'ML Settings saved', description: 'Model configurations updated successfully.' })
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>
      toast({ 
        title: 'Save failed', 
        description: axiosError.response?.data?.detail || 'An unexpected error occurred while saving.', 
        variant: 'destructive' 
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRetrain = async () => {
    try {
      await client.post('/ml/retrain')
      toast({ title: 'Retraining started', description: 'The model is now retraining in the background.' })
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>
      toast({ 
        title: 'Retrain failed', 
        description: axiosError.response?.data?.detail || 'Could not trigger retraining.', 
        variant: 'destructive' 
      })
    }
  }

  if (loading || !settings) return <div className="p-8">Loading...</div>

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-4xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Machine Learning</h1>
          <p className="text-xs md:text-sm text-zinc-500 mt-1">Tune delay prediction and SHAP explainer settings.</p>
        </div>
        <Button onClick={handleRetrain} variant="outline" className="w-full sm:w-auto gap-2 h-11 border-zinc-200 bg-white shadow-sm font-bold text-xs md:text-sm rounded-xl">
          <Activity size={14} className="text-emerald-500" /> Force Retrain Now
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6 md:space-y-8">
        
        {/* Core Engine */}
        <Card className="border-emerald-100 bg-emerald-50/10">
          <CardContent className="p-5 md:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-emerald-100 pb-4">
              <Brain className="text-emerald-500 shrink-0" size={20} />
              <h2 className="text-base md:text-lg font-bold text-emerald-950">Prediction Engine</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-sm md:text-base font-bold text-zinc-900">Enable Delay Prediction</Label>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">Predict delay probability on active tasks.</p>
                </div>
                <Switch 
                  checked={settings.delay_prediction_enabled} 
                  onCheckedChange={(c: boolean) => setSettings({...settings, delay_prediction_enabled: c})}
                  className="scale-90 md:scale-100"
                />
              </div>

              <div className="flex items-start justify-between gap-4 pt-4 border-t border-emerald-100/30">
                <div className="flex-1">
                  <Label className="text-sm md:text-base font-bold text-zinc-900">Enable SHAP Explanations</Label>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">Human-readable high-risk explanations.</p>
                </div>
                <Switch 
                  checked={settings.shap_explanations_enabled} 
                  onCheckedChange={(c: boolean) => setSettings({...settings, shap_explanations_enabled: c})}
                  className="scale-90 md:scale-100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hyperparameters */}
        <Card className="border-zinc-200">
          <CardContent className="p-5 md:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
              <Cpu className="text-zinc-400 shrink-0" size={20} />
              <h2 className="text-base md:text-lg font-bold text-zinc-900">Hyperparameters</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
              <div className="space-y-2">
                <Label className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-zinc-500">Confidence Threshold</Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.confidence_threshold} 
                  onChange={e => setSettings({...settings, confidence_threshold: parseFloat(e.target.value) || 0.65})}
                  className="bg-zinc-50 border-zinc-200 h-11 font-mono text-sm rounded-xl"
                />
                <p className="text-[10px] text-zinc-400 font-medium">Flagging probability (0.0 - 1.0).</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-zinc-500">Historical Data Weight</Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.historical_data_weight} 
                  onChange={e => setSettings({...settings, historical_data_weight: parseFloat(e.target.value) || 0.8})}
                  className="bg-zinc-50 border-zinc-200 h-11 font-mono text-sm rounded-xl"
                />
                <p className="text-[10px] text-zinc-400 font-medium">Past vs current metrics (0.0 - 1.0).</p>
              </div>
              <div className="space-y-2 md:col-span-2 md:w-1/2">
                <Label className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-zinc-500">Retrain Interval (Days)</Label>
                <Input 
                  type="number"
                  min="1"
                  value={settings.retrain_interval_days} 
                  onChange={e => setSettings({...settings, retrain_interval_days: parseInt(e.target.value) || 7})}
                  className="bg-zinc-50 border-zinc-200 h-11 font-mono text-sm rounded-xl"
                />
                <p className="text-[10px] text-zinc-400 font-medium">Automatic retraining cycle frequency.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button 
            type="submit" 
            disabled={saving} 
            className="w-full sm:w-auto bg-zinc-900 text-white font-black uppercase tracking-widest text-[11px] h-12 px-10 rounded-2xl shadow-xl shadow-zinc-900/20"
          >
            {saving ? 'Saving...' : <><Save size={14} className="mr-2" /> Save Configuration</>}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default MLConfigPage
