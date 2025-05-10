import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import Slider from "react-slick";
import { ColorModeContext } from "../../context/ThemeContext";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./Slides.css";
import A from "../../assets/4.avif";
import B from "../../assets/dice.png";
import C from "../../assets/first.png";
import D from "../../assets/2.png";
import E from "../../assets/6.png";
import F from "../../assets/5.png";

// Array of slide data
const slides = [
    { id: 1, img: C, alt: "Slide 1", path: "/slide1" },
    { id: 2, img: A, alt: "Slide 2", path: "/slide2" },
    { id: 3, img: B, alt: "Slide 3", path: "/slide3" },
    { id: 4, img: F, alt: "Slide 4", path: "/slide4" },
    { id: 5, img: E, alt: "Slide 5", path: "/slide5" },
    { id: 6, img: D, alt: "Slide 6", path: "/slide6" },

];

const FeaturedGamesSlider = () => {
    const navigate = useNavigate();
    const { mode } = useContext(ColorModeContext);

    // Slider settings
    const settings = {
        dots: true, // Show navigation dots
        infinite: true, // Loop slides
        speed: 500, // Transition speed
        slidesToShow: 3, // Show 3 slides at a time
        slidesToScroll: 1, // Scroll 1 slide at a time
        autoplay: true, // Auto-play slides
        autoplaySpeed: 2000, // 2 seconds per slide
        pauseOnHover: true, // Pause on hover
        arrows: true, // Show next/prev arrows
        responsive: [
            {
                breakpoint: 900,
                settings: {
                    slidesToShow: 2, // Show 2 slides on medium screens
                },
            },
            {
                breakpoint: 600,
                settings: {
                    slidesToShow: 1, // Show 1 slide on small screens
                },
            },
        ],
    };

    return (
        <div className={`slider-container ${mode}`}>
            <Slider {...settings}>
                {slides.map((slide) => (
                    <div
                        key={slide.id}
                        className="slide-item"
                        onClick={() => navigate(slide.path)}
                    >
                        <img src={slide.img} alt={slide.alt} />
                    </div>
                ))}
            </Slider>
        </div>
    );
};

export default FeaturedGamesSlider;