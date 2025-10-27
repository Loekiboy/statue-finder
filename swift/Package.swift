// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "StatueFinder",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "StatueFinder",
            targets: ["StatueFinder"]),
    ],
    dependencies: [
        // Supabase Swift SDK
        .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.5.0"),
    ],
    targets: [
        .target(
            name: "StatueFinder",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
            ],
            path: "StatueFinder"
        ),
    ]
)
