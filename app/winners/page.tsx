'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Winner {
  id: string;
  username: string;
  item: string;
  timestamp: string;
}

export default function WinnersPage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWinners();
  }, []);

  const fetchWinners = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/winners');
      const data = await response.json();
      setWinners(data);
    } catch (error) {
      console.error('Error fetching winners:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('id-ID');
  };

  // Hitung statistik hadiah
  const prizeStats = winners.reduce((acc, winner) => {
    acc[winner.item] = (acc[winner.item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalSpins = winners.length;
  const mitosMutasiCount = prizeStats['Mitos Mutasi'] || 0;
  const mitosCount = prizeStats['Mitos'] || 0;
  const zonkCount = prizeStats['Zonk'] || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-white text-center">
                🏆 Daftar Pemenang Lucky Wheel
              </CardTitle>
              <CardDescription className="text-center text-gray-300">
                Loading data pemenang...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-white text-center">
              🏆 Daftar Pemenang Lucky Wheel
            </CardTitle>
            <CardDescription className="text-center text-gray-300">
              Data pemenang yang telah memenangkan hadiah dari lucky wheel dengan sistem probabilitas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Prize Statistics */}
            {winners.length > 0 && (
              <div className="mb-6 p-4 bg-white/5 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-3 text-center">📊 Statistik Hadiah</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-yellow-500/20 rounded-lg p-3">
                    <div className="text-yellow-400 font-bold text-xl">{mitosMutasiCount}</div>
                    <div className="text-xs text-gray-300">Mitos Mutasi</div>
                    <div className="text-xs text-yellow-400">{totalSpins > 0 ? ((mitosMutasiCount / totalSpins) * 100).toFixed(1) : 0}%</div>
                  </div>
                  <div className="bg-blue-500/20 rounded-lg p-3">
                    <div className="text-blue-400 font-bold text-xl">{mitosCount}</div>
                    <div className="text-xs text-gray-300">Mitos</div>
                    <div className="text-xs text-blue-400">{totalSpins > 0 ? ((mitosCount / totalSpins) * 100).toFixed(1) : 0}%</div>
                  </div>
                  <div className="bg-red-500/20 rounded-lg p-3">
                    <div className="text-red-400 font-bold text-xl">{zonkCount}</div>
                    <div className="text-xs text-gray-300">Zonk</div>
                    <div className="text-xs text-red-400">{totalSpins > 0 ? ((zonkCount / totalSpins) * 100).toFixed(1) : 0}%</div>
                  </div>
                </div>
                <div className="text-center mt-2 text-gray-400 text-sm">
                  Total Spin: {totalSpins}
                </div>
              </div>
            )}
            
            {winners.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-300 text-lg">Belum ada pemenang yang tercatat</p>
                <p className="text-gray-400 text-sm mt-2">Kirim minimal 5 coins di TikTok Live untuk berpartisipasi!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-white">No</TableHead>
                      <TableHead className="text-white">Username</TableHead>
                      <TableHead className="text-white">Hadiah yang Dimenangkan</TableHead>
                      <TableHead className="text-white">Waktu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {winners.map((winner, index) => (
                      <TableRow key={winner.id} className="border-gray-700">
                        <TableCell className="text-white font-medium">{index + 1}</TableCell>
                        <TableCell className="text-white">
                          <Badge variant="secondary" className="bg-purple-600 text-white">
                            @{winner.username}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white">{winner.item}</TableCell>
                        <TableCell className="text-gray-300 text-sm">
                          {formatDate(winner.timestamp)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}