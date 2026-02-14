'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, AirplaneTilt, CalendarBlank } from '@phosphor-icons/react';
import type { ContinentTheme } from '../continent-theme';

interface CountdownCardProps {
  departureDate: string;
  destination: string;
  dossierTitle: string;
  dossierId: string;
  heroPhotoUrl?: string | null;
  continentTheme: ContinentTheme;
}

function computeCountdown(targetDate: string) {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    // Check if currently traveling (within 30 days after departure)
    const daysPast = Math.abs(diff) / (1000 * 60 * 60 * 24);
    if (daysPast <= 30) return { status: 'traveling' as const, days: 0, hours: 0, minutes: 0 };
    return { status: 'past' as const, days: 0, hours: 0, minutes: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { status: 'upcoming' as const, days, hours, minutes };
}

export function CountdownCard({
  departureDate,
  destination,
  dossierTitle,
  dossierId,
  heroPhotoUrl,
  continentTheme,
}: CountdownCardProps) {
  const [countdown, setCountdown] = useState(() => computeCountdown(departureDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(computeCountdown(departureDate));
    }, 60_000); // Update every minute
    return () => clearInterval(interval);
  }, [departureDate]);

  return (
    <Link href={`/client/voyages/${dossierId}`} className="block group">
      <div className="relative overflow-hidden rounded-2xl h-[220px]">
        {/* Background */}
        {heroPhotoUrl ? (
          <Image
            src={heroPhotoUrl}
            alt={dossierTitle}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="100vw"
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${continentTheme.gradient}`}
          />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-between p-6 text-white">
          {/* Top: status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AirplaneTilt size={20} weight="duotone" />
              <span className="text-sm font-medium opacity-90">
                {countdown.status === 'traveling'
                  ? 'En voyage !'
                  : countdown.status === 'past'
                    ? 'Voyage terminé'
                    : 'Prochain départ'}
              </span>
            </div>
            {countdown.status === 'upcoming' && (
              <div
                className="px-3 py-1 rounded-full text-sm font-bold backdrop-blur-md"
                style={{ backgroundColor: `${continentTheme.primary}CC` }}
              >
                J-{countdown.days}
              </div>
            )}
          </div>

          {/* Bottom: info + countdown */}
          <div>
            {countdown.status === 'upcoming' && (
              <div className="flex items-center gap-4 mb-3">
                <div className="text-center">
                  <div className="text-3xl font-bold tabular-nums">{countdown.days}</div>
                  <div className="text-xs opacity-70">jours</div>
                </div>
                <div className="text-2xl opacity-30">:</div>
                <div className="text-center">
                  <div className="text-3xl font-bold tabular-nums">{countdown.hours}</div>
                  <div className="text-xs opacity-70">heures</div>
                </div>
                <div className="text-2xl opacity-30">:</div>
                <div className="text-center">
                  <div className="text-3xl font-bold tabular-nums">{countdown.minutes}</div>
                  <div className="text-xs opacity-70">min</div>
                </div>
              </div>
            )}

            <h2 className="text-xl font-bold leading-tight">{dossierTitle}</h2>
            <div className="flex items-center gap-3 mt-1.5">
              {destination && (
                <span className="text-sm opacity-80">{destination}</span>
              )}
              {departureDate && (
                <span className="flex items-center gap-1 text-sm opacity-60">
                  <CalendarBlank size={14} weight="duotone" />
                  {new Date(departureDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-3 text-sm font-medium opacity-90 group-hover:opacity-100 transition-opacity">
              Voir mon voyage
              <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
