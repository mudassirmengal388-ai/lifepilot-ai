export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      
      <nav className="flex justify-between items-center px-10 py-5 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-purple-400">🤖 CloneMe AI</h1>
        <div className="flex gap-6 text-gray-300">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
          <a href="#contact" className="hover:text-white">Contact</a>
        </div>
        <button className="bg-purple-600 hover:bg-purple-700 px-5 py-2 rounded-full text-sm font-semibold">
          Get Started Free
        </button>
      </nav>

      <section className="flex flex-col items-center justify-center text-center py-32 px-6">
        <span className="bg-purple-900 text-purple-300 text-sm px-4 py-1 rounded-full mb-6">
          🚀 World's First AI Digital Clone Platform
        </span>
        <h2 className="text-5xl font-bold leading-tight mb-6">
          You Rest. <br />
          <span className="text-purple-400">Your AI Clone Works.</span>
        </h2>
        <p className="text-gray-400 text-lg max-w-xl mb-10">
          Create your digital twin that replies to emails, attends meetings, 
          manages social media — all in your voice and personality.
        </p>
        <div className="flex gap-4">
          <button className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-full font-semibold text-lg">
            Create My Clone →
          </button>
          <button className="border border-gray-600 hover:border-white px-8 py-3 rounded-full font-semibold text-lg">
            Watch Demo
          </button>
        </div>
      </section>

      <section id="features" className="py-20 px-10 bg-gray-950">
        <h3 className="text-3xl font-bold text-center mb-12">What Your Clone Can Do</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { icon: "📧", title: "Reply Emails", desc: "Your clone writes emails exactly in your style and tone" },
            { icon: "🎙️", title: "Attend Meetings", desc: "AI joins meetings and speaks in your voice" },
            { icon: "💬", title: "Chat & Messages", desc: "Replies to WhatsApp, Slack, Telegram for you" },
            { icon: "📱", title: "Social Media", desc: "Posts content on your behalf, daily and consistently" },
            { icon: "🧠", title: "Learns From You", desc: "Gets smarter every day by learning your decisions" },
            { icon: "🔒", title: "100% Private", desc: "Your data is encrypted and never shared" },
          ].map((f, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-purple-500 transition">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h4 className="text-xl font-semibold mb-2">{f.title}</h4>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="py-20 px-10 text-center">
        <h3 className="text-3xl font-bold mb-12">Simple Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { plan: "Starter", price: "Free", features: ["Email replies", "Basic clone", "5 tasks/day"] },
            { plan: "Pro", price: "$19/mo", features: ["Everything in Starter", "Voice clone", "Meetings", "Unlimited tasks"], highlight: true },
            { plan: "Enterprise", price: "$99/mo", features: ["Everything in Pro", "Multiple clones", "API access", "Priority support"] },
          ].map((p, i) => (
            <div key={i} className={`rounded-2xl p-8 border ${p.highlight ? "border-purple-500 bg-purple-950" : "border-gray-800 bg-gray-900"}`}>
              <h4 className="text-xl font-bold mb-2">{p.plan}</h4>
              <p className="text-3xl font-bold text-purple-400 mb-6">{p.price}</p>
              <ul className="text-gray-300 text-sm space-y-2 mb-8">
                {p.features.map((f, j) => <li key={j}>✅ {f}</li>)}
              </ul>
              <button className={`w-full py-2 rounded-full font-semibold ${p.highlight ? "bg-purple-600 hover:bg-purple-700" : "border border-gray-600 hover:border-white"}`}>
                Get Started
              </button>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center py-10 text-gray-600 border-t border-gray-800">
        <p>© 2025 CloneMe AI — All rights reserved</p>
      </footer>

    </main>
  );
}