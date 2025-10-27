//
//  LiquidGlassTabBar.swift
//  StatueFinder
//
//  Custom liquid glass bottom navigation bar with fluid animations
//

import SwiftUI

struct LiquidGlassTabBar: View {
    @Binding var selectedTab: Int
    @Namespace private var animation
    
    let tabs: [TabItem] = [
        TabItem(icon: "map.fill", title: "Kaart"),
        TabItem(icon: "star.fill", title: "Ontdekkingen"),
        TabItem(icon: "plus.circle.fill", title: "Upload"),
        TabItem(icon: "chart.bar.fill", title: "Leaderboard"),
        TabItem(icon: "person.fill", title: "Profiel")
    ]
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(0..<tabs.count, id: \.self) { index in
                TabButton(
                    tab: tabs[index],
                    isSelected: selectedTab == index,
                    namespace: animation
                ) {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        selectedTab = index
                    }
                    
                    // Haptic feedback
                    let impact = UIImpactFeedbackGenerator(style: .medium)
                    impact.impactOccurred()
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 12)
        .background(
            // Liquid glass effect
            ZStack {
                // Blur background
                VisualEffectBlur(style: .systemUltraThinMaterialDark)
                
                // Gradient overlay
                LinearGradient(
                    colors: [
                        Color.white.opacity(0.15),
                        Color.white.opacity(0.05)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                
                // Border highlight
                RoundedRectangle(cornerRadius: 30)
                    .stroke(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0.3),
                                Color.white.opacity(0.1)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            }
            .clipShape(RoundedRectangle(cornerRadius: 30))
            .shadow(color: Color.black.opacity(0.3), radius: 20, x: 0, y: 10)
        )
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }
}

struct TabButton: View {
    let tab: TabItem
    let isSelected: Bool
    let namespace: Namespace.ID
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                ZStack {
                    if isSelected {
                        // Animated background for selected tab
                        RoundedRectangle(cornerRadius: 16)
                            .fill(
                                LinearGradient(
                                    colors: [
                                        Color.blue.opacity(0.6),
                                        Color.blue.opacity(0.3)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .matchedGeometryEffect(id: "TAB", in: namespace)
                            .frame(height: 50)
                    }
                    
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: isSelected ? 24 : 22))
                            .foregroundColor(isSelected ? .white : .white.opacity(0.6))
                        
                        Text(tab.title)
                            .font(.system(size: 10, weight: isSelected ? .semibold : .regular))
                            .foregroundColor(isSelected ? .white : .white.opacity(0.6))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }
            }
        }
        .buttonStyle(TabButtonStyle())
    }
}

struct TabButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.spring(response: 0.2, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

struct TabItem {
    let icon: String
    let title: String
}

// Custom UIViewRepresentable for UIVisualEffectView blur
struct VisualEffectBlur: UIViewRepresentable {
    var style: UIBlurEffect.Style
    
    func makeUIView(context: Context) -> UIVisualEffectView {
        return UIVisualEffectView(effect: UIBlurEffect(style: style))
    }
    
    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {
        uiView.effect = UIBlurEffect(style: style)
    }
}

struct LiquidGlassTabBar_Previews: PreviewProvider {
    static var previews: some View {
        VStack {
            Spacer()
            LiquidGlassTabBar(selectedTab: .constant(0))
        }
        .background(Color.black)
    }
}
