'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { IoHomeOutline, IoTimeOutline, IoQrCodeOutline, IoWalletOutline } from 'react-icons/io5';
import { MdOutlineQrCodeScanner } from 'react-icons/md';
import { SiStellar } from 'react-icons/si';

function Tab({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 ${
        active ? 'text-[#FFC940]' : 'text-gray-400'
      }`}
    >
      <div className={`text-2xl ${active ? '' : ''}`}>{icon}</div>
      <div className={`text-[11px] font-semibold ${active ? '' : ''}`}>{label}</div>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Hide navbar on auth/setup routes
  const hide =
    pathname.startsWith('/login') ||
    pathname.startsWith('/connect-wallet');

  if (hide) return null;

  const isHome = pathname === '/' || pathname.startsWith('/home');
  const isWallet = pathname.startsWith('/wallet');
  const isPay = pathname.startsWith('/pay');
  const isActivity = pathname.startsWith('/activity');

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[80]">
        {/* slight blur + safe area friendly */}
        <div className="mx-auto max-w-md px-4 pb-4">
          <div className="bg-black/95 backdrop-blur border border-gray-800 rounded-2xl shadow-lg relative pt-1 pb-2">
            {/* Big circular QR button elevated above nav */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-2">
              <button
                onClick={() => setShowQRScanner(true)}
                className="w-18 h-18 rounded-full bg-[#FFC940] shadow-2xl flex items-center justify-center active:scale-95 transition-transform border-4 border-black"
              >
                <MdOutlineQrCodeScanner className="text-3xl text-black" />
              </button>
            </div>

            <div className="flex items-stretch pt-2">
              <Tab href="/home" label="Home" icon={<IoHomeOutline />} active={isHome} />
              <Tab href="/pay" label="Stellar Pay" icon={<SiStellar />} active={isPay} />

              <div className="flex-1" />

              <Link
                href="/wallet"
                className="flex-1 flex items-center justify-center py-2"
              >
                <div className="flex flex-col items-center justify-center gap-1">
                  <IoWalletOutline className={`text-2xl ${isWallet ? 'text-[#FFC940]' : 'text-gray-400'}`} />
                  <div className={`text-[11px] font-semibold ${isWallet ? 'text-[#FFC940]' : 'text-gray-400'}`}>Wallet</div>
                </div>
              </Link>

              <Tab href="/activity" label="Activity" icon={<IoTimeOutline />} active={isActivity} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
