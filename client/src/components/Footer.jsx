
import { Link } from "react-router-dom";
import {
    PlaneTakeoff,
    Mail,
    MapPin,
    Phone,
} from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-ink text-white mt-20">
            <div className="container-wide py-14 grid gap-10 md:grid-cols-3">

                {/* Brand */}
                <div>
                    <div className="flex gap-2 items-center text-2xl font-bold">
                        <PlaneTakeoff />
                        TravelEase
                    </div>

                    <p className="mt-4 text-slate-300 text-sm leading-7">
                        Discover beautiful destinations and create
                        unforgettable travel memories.
                    </p>
                </div>

                {/* Quick Links */}
                <div>
                    <h3 className="font-bold mb-4">Quick Links</h3>

                    <div className="flex flex-col gap-3 text-slate-300 text-sm">
                        <Link to="/packages" className="hover:text-white">
                            Tour Packages
                        </Link>

                        <Link to="/destinations" className="hover:text-white">
                            Destinations
                        </Link>

                        <Link to="/about" className="hover:text-white">
                            About Us
                        </Link>

                        <Link to="/contact" className="hover:text-white">
                            Contact Us
                        </Link>
                    </div>
                </div>

                {/* Contact */}
                <div>
                    <h3 className="font-bold mb-4">Contact</h3>

                    <div className="space-y-4 text-sm text-slate-300">

                        <a
                            href="https://www.google.com/maps/search/?api=1&query=New%20Kondli%2C%20Mayur%20Vihar%20Phase%203%2C%20Delhi%20110096"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 hover:text-white transition-colors"
                        >
                            <MapPin size={18} className="shrink-0 mt-1" />

                            <span>
                                New Kondli, Mayur Vihar Phase-III,
                                <br />
                                Delhi - 110096
                            </span>
                        </a>

                        <a
                            href="mailto:mdziyaulhaque692@gmail.com"
                            className="flex items-center gap-3 hover:text-white break-all"
                        >
                            <Mail size={18} className="shrink-0" />
                            mdziyaulhaque692@gmail.com
                        </a>

                        <a
                            href="tel:+919507793711"
                            className="flex items-center gap-3 hover:text-white"
                        >
                            <Phone size={18} />
                            9507793711
                        </a>

                    </div>
                </div>
            </div>

            {/* Footer Bottom */}
            <div className="border-t border-slate-700 text-center text-slate-400 text-sm py-5">
                © {new Date().getFullYear()} TravelEase.
                All Rights Reserved.
            </div>
        </footer>
    );
}
