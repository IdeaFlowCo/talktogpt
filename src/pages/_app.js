import React from 'react';
import 'styles/global.css';
import 'util/analytics';
// import Chat from "components/CrispChat";
import { AuthProvider } from 'util/auth';
import { NextUIProvider } from "@nextui-org/react";
import { client } from 'util/db';
import { QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import Navbar from 'components/Navbar';
import Footer from 'components/Footer';

function MyApp({ Component, pageProps }) {
  return (

    <QueryClientProvider client={client}>
      <AuthProvider>
        {/* <Chat /> */}
        <>
          {/* <Navbar /> */}
          <Navbar />
          <NextUIProvider className='flex h-full w-screen flex-col'>
            <Component {...pageProps} />
          </NextUIProvider>
          <Toaster />
          <Footer />
        </>
      </AuthProvider>
    </QueryClientProvider>

  );
}

export default MyApp;
