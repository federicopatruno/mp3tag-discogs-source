import Image from "next/image";
import React from "react";

const Hero = () => {
  return (
    <section className="text-gray-400 bg-gray-900 body-font">
      <div className="container flex flex-col items-center justify-center min-h-screen px-5 py-24 mx-auto">
        {/* <Image
          className="object-cover object-center w-5/6 mb-10 rounded lg:w-2/6 md:w-3/6"
          alt="hero"
          src="https://dummyimage.com/720x600"
        /> */}
        <div className="w-full text-center lg:w-2/3">
          <h1 className="mb-4 text-3xl font-medium text-white title-font sm:text-4xl">
            Discogs Tags formatted for Mp3Tags
          </h1>
          <p className="mb-8 leading-relaxed">
            Meggings kinfolk echo park stumptown DIY, kale chips beard jianbing
            tousled. Chambray dreamcatcher trust fund, kitsch vice godard
            disrupt ramps hexagon mustache umami snackwave tilde chillwave ugh.
            Pour-over meditation PBR&amp;B pickled ennui celiac mlkshk freegan
            photo booth af fingerstache pitchfork.
          </p>
          <div className="flex justify-center">
            <button
              className="inline-flex px-6 py-2 text-lg text-white bg-yellow-500 border-0 rounded focus:outline-none hover:bg-yellow-600"
              control-id="ControlID-86"
            >
              Button
            </button>
            <button className="inline-flex px-6 py-2 ml-4 text-lg text-gray-400 bg-gray-800 border-0 rounded focus:outline-none hover:bg-gray-700 hover:text-white">
              Button
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
