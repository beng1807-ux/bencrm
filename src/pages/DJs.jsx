import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Music, Phone, Mail, Calendar, Plus, Edit, X } from 'lucide-react';
import { toast } from 'sonner';

export default function DJs() {
  const [djs, setDJs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDJ, setSelectedDJ] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [djEvents, setDJEvents] = useState([]);

  useEffect(() => {
    loadDJs();
  }, []);

  const loadDJs = async () => {
    try {
      const data = await base44.entities.DJ.list('-created_date');
      setDJs(data);
    } catch (error) {
      console.error('Error loading DJs:', error);
      toast.error('שגיאה בטעינת DJ-ים');
    } finally {
      setLoading(false);
    }
  };

  const openDJDetails = async (dj) => {
    setSelectedDJ(dj);
    setDetailsOpen(true);
    
    try {
      const events = await base44.entities.Event.filter({ dj_id: dj.id }, '-event_date');
      setDJEvents(events);
    } catch (error) {
      console.error('Error loading DJ events:', error);
    }
  };

  const getStatusColor = (status) => {
    return status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Music className="w-8 h-8" />
            DJ-ים
          </h1>
          <p className="text-gray-600">ניהול צוות ה-DJ-ים</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {djs.map(dj => (
          <Card key={dj.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => openDJDetails(dj)}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Music className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{dj.name}</h3>
                  <Badge className={getStatusColor(dj.status)}>
                    {dj.status === 'ACTIVE' ? 'פעיל' : 'לא פעיל'}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  {dj.phone}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  {dj.email}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600">אירועים: {dj.total_events || 0}</span>
                  {dj.unavailable_dates?.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {dj.unavailable_dates.length} תאריכים חסומים
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {djs.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-gray-500">
              אין DJ-ים במערכת
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedDJ && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Music className="w-6 h-6" />
                  {selectedDJ.name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>טלפון</Label>
                    <p className="mt-1 font-medium">{selectedDJ.phone}</p>
                  </div>
                  <div>
                    <Label>אימייל</Label>
                    <p className="mt-1 font-medium">{selectedDJ.email}</p>
                  </div>
                  <div>
                    <Label>סטטוס</Label>
                    <Badge className={getStatusColor(selectedDJ.status)}>
                      {selectedDJ.status === 'ACTIVE' ? 'פעיל' : 'לא פעיל'}
                    </Badge>
                  </div>
                  <div>
                    <Label>סך אירועים</Label>
                    <p className="mt-1 font-medium">{selectedDJ.total_events || 0}</p>
                  </div>
                </div>

                {selectedDJ.notes && (
                  <div>
                    <Label>הערות</Label>
                    <p className="mt-1 text-sm bg-gray-50 p-3 rounded">{selectedDJ.notes}</p>
                  </div>
                )}

                {selectedDJ.unavailable_dates?.length > 0 && (
                  <div>
                    <Label>תאריכים לא זמינים</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedDJ.unavailable_dates.map(date => (
                        <Badge key={date} variant="secondary">
                          {new Date(date).toLocaleDateString('he-IL')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4">אירועים משובצים</h3>
                  <div className="space-y-2">
                    {djEvents.map(event => (
                      <Card key={event.id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{event.event_type}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(event.event_date).toLocaleDateString('he-IL')}
                              </p>
                            </div>
                            <Badge>{event.event_status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {djEvents.length === 0 && (
                      <p className="text-center text-gray-500 py-8">אין אירועים משובצים</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}