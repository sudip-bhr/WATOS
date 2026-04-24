import { useState, useEffect } from 'react'
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
    // Stub implementation
    client.get('/ml/config')
      .then(res => setSettings(res.data))
      .catch((err) => {
        if (err.response?.status === 404) {
          setSettings({
            delay_prediction_enabled: true,
            shap_explanations_enabled: true,
            confidence_threshold: 0.65,
            retrain_interval_days: 7,
            historical_data_weight: 0.8
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await client.put('/ml/config', settings)
      toast({ title: 'ML Settings saved', description: 'Model configurations updated.' })
    } catch (err) {
      toast({ title: 'Save failed', description: 'Backend endpoint /ml/config not yet implemented.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleRetrain = async () => {
    try {
      await client.post('/ml/retrain')
      toast({ title: 'Retraining started', description: 'The model is now retraining in the background.' })
    } catch (err) {
      toast({ title: 'Retrain failed', description: 'Endpoint not yet implemented.', variant: 'destructive' })
    }
  }

  if (loading || !settings) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Machine Learning Configuration</h1>
          <p className="text-zinc-500 mt-1">Tune delay prediction models and SHAP explainer settings.</p>
        </div>
        <Button onClick={handleRetrain} variant="outline" className="gap-2 h-11 border-zinc-200 bg-white shadow-sm font-bold">
          <Activity size={16} className="text-emerald-500" /> Force Retrain Now
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Core Engine */}
        <Card className="border-emerald-100 bg-emerald-50/10">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-emerald-100 pb-4">
              <Brain className="text-emerald-500" />
              <h2 className="text-lg font-bold text-emerald-950">Prediction Engine</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base text-zinc-900">Enable Delay Prediction</Label>
                  <p className="text-sm text-zinc-500">Run the ML model on all active tasks to predict delay probability.</p>
                </div>
                <Switch 
                  checked={settings.delay_prediction_enabled} 
                  onCheckedChange={(c: boolean) => setSettings({...settings, delay_prediction_enabled: c})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base text-zinc-900">Enable SHAP Explanations</Label>
                  <p className="text-sm text-zinc-500">Generate human-readable explanations for high-risk predictions.</p>
                </div>
                <Switch 
                  checked={settings.shap_explanations_enabled} 
                  onCheckedChange={(c: boolean) => setSettings({...settings, shap_explanations_enabled: c})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hyperparameters */}
        <Card className="border-zinc-200">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
              <Cpu className="text-zinc-400" />
              <h2 className="text-lg font-bold">Hyperparameters</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label>Confidence Threshold (0.0 - 1.0)</Label>
                <p className="text-[10px] text-zinc-400 font-medium">Minimum probability to flag a task as "High Risk".</p>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.confidence_threshold} 
                  onChange={e => setSettings({...settings, confidence_threshold: parseFloat(e.target.value) || 0.65})}
                  className="bg-zinc-50 border-zinc-200 h-11 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Historical Data Weight (0.0 - 1.0)</Label>
                <p className="text-[10px] text-zinc-400 font-medium">Weight given to past performance vs current metrics.</p>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.historical_data_weight} 
                  onChange={e => setSettings({...settings, historical_data_weight: parseFloat(e.target.value) || 0.8})}
                  className="bg-zinc-50 border-zinc-200 h-11 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Retrain Interval (Days)</Label>
                <p className="text-[10px] text-zinc-400 font-medium">How often the model automatically retrains.</p>
                <Input 
                  type="number"
                  min="1"
                  value={settings.retrain_interval_days} 
                  onChange={e => setSettings({...settings, retrain_interval_days: parseInt(e.target.value) || 7})}
                  className="bg-zinc-50 border-zinc-200 h-11 font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pt-4">
          <Button type="submit" disabled={saving} className="bg-zinc-900 text-white gap-2 h-11 px-8 rounded-xl shadow-xl shadow-zinc-900/20">
            {saving ? 'Saving...' : <><Save size={16} /> Save ML Config</>}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default MLConfigPage
